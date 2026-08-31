import type { PrismaClient } from '../db'
import { HttpError } from '../middleware/errorHandler'

export interface DependencySummary {
  id: string
  title: string
  status: string
}

export async function listDependencies(
  prisma: PrismaClient,
  taskId: string
): Promise<{ dependsOn: DependencySummary[]; dependents: DependencySummary[] }> {
  const [dependsOn, dependents] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { taskId },
      include: { dependsOnTask: { select: { id: true, title: true, status: true } } }
    }),
    prisma.taskDependency.findMany({
      where: { dependsOnId: taskId },
      include: { task: { select: { id: true, title: true, status: true } } }
    })
  ])

  return {
    dependsOn: dependsOn.map((edge) => edge.dependsOnTask),
    dependents: dependents.map((edge) => edge.task)
  }
}

/**
 * Would adding "taskId depends on dependsOnId" create a cycle? True iff
 * dependsOnId can already (transitively) reach taskId by following existing
 * "depends on" edges forward from dependsOnId.
 */
async function wouldCreateCycle(prisma: PrismaClient, taskId: string, dependsOnId: string): Promise<boolean> {
  const visited = new Set<string>()
  const stack = [dependsOnId]
  while (stack.length > 0) {
    const current = stack.pop() as string
    if (current === taskId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const edges = await prisma.taskDependency.findMany({
      where: { taskId: current },
      select: { dependsOnId: true }
    })
    for (const edge of edges) stack.push(edge.dependsOnId)
  }
  return false
}

export async function addDependency(prisma: PrismaClient, taskId: string, dependsOnId: string): Promise<void> {
  if (taskId === dependsOnId) {
    throw new HttpError(400, 'A task cannot depend on itself')
  }

  const [task, dependsOnTask] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId } }),
    prisma.task.findUnique({ where: { id: dependsOnId } })
  ])
  if (!task || !dependsOnTask) throw new HttpError(404, 'Task not found')

  const existing = await prisma.taskDependency.findUnique({
    where: { taskId_dependsOnId: { taskId, dependsOnId } }
  })
  if (existing) return

  if (await wouldCreateCycle(prisma, taskId, dependsOnId)) {
    throw new HttpError(400, 'That dependency would create a cycle')
  }

  await prisma.taskDependency.create({ data: { taskId, dependsOnId } })
}

export async function removeDependency(prisma: PrismaClient, taskId: string, dependsOnId: string): Promise<void> {
  await prisma.taskDependency.deleteMany({ where: { taskId, dependsOnId } })
}

export async function computeBlockedByDependencies(
  prisma: PrismaClient,
  taskId: string
): Promise<{ blocked: boolean; blockingTasks: DependencySummary[] }> {
  const edges = await prisma.taskDependency.findMany({
    where: { taskId },
    include: { dependsOnTask: { select: { id: true, title: true, status: true } } }
  })
  const blockingTasks = edges.map((edge) => edge.dependsOnTask).filter((t) => t.status !== 'DONE')
  return { blocked: blockingTasks.length > 0, blockingTasks }
}
