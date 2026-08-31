import type { PrismaClient, Task, Project } from '../db'
import { HttpError } from '../middleware/errorHandler'
import { STATUSES_REQUIRING_COMMENT, type StatusValue } from '../types/status'
import {
  deserializeEditorJsContent,
  editorJsContentToPlainText,
  serializeEditorJsContent,
  type EditorJsOutputData
} from '../utils/editorjs'
import { computeBlockedByDependencies, type DependencySummary } from './dependencyService'

type TaskWithProject = Task & { project: Project }

const taskInclude = { project: true } as const

export interface TaskDTO {
  id: string
  title: string
  description: string | null
  status: StatusValue
  date: string
  startDate: string | null
  endDate: string | null
  order: number
  completedAt: string | null
  projectId: string
  project: { id: string; name: string; color: string }
  createdAt: string
  updatedAt: string
  blockedByDependencies: boolean
  blockingTasks: DependencySummary[]
  subtaskProgress: { total: number; done: number }
}

function baseDTO(task: TaskWithProject): Omit<TaskDTO, 'blockedByDependencies' | 'blockingTasks' | 'subtaskProgress'> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as StatusValue,
    date: task.date.toISOString(),
    startDate: task.startDate?.toISOString() ?? null,
    endDate: task.endDate?.toISOString() ?? null,
    order: task.order,
    completedAt: task.completedAt?.toISOString() ?? null,
    projectId: task.projectId,
    project: { id: task.project.id, name: task.project.name, color: task.project.color },
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  }
}

async function attachComputedFields(prisma: PrismaClient, task: TaskWithProject): Promise<TaskDTO> {
  const [blocked, subtasks] = await Promise.all([
    computeBlockedByDependencies(prisma, task.id),
    prisma.subtask.findMany({ where: { taskId: task.id }, select: { status: true } })
  ])
  return {
    ...baseDTO(task),
    blockedByDependencies: blocked.blocked,
    blockingTasks: blocked.blockingTasks,
    subtaskProgress: {
      total: subtasks.length,
      done: subtasks.filter((s) => s.status === 'DONE').length
    }
  }
}

function assertCommentIfRequired(status: StatusValue | undefined, comment: EditorJsOutputData | undefined): void {
  if (!status || !STATUSES_REQUIRING_COMMENT.has(status)) return
  const text = comment ? editorJsContentToPlainText(comment) : ''
  if (!text) {
    throw new HttpError(400, `A comment explaining what happened is required when setting status to ${status}.`)
  }
}

async function getTaskRecordOrThrow(prisma: PrismaClient, id: string): Promise<TaskWithProject> {
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude })
  if (!task) throw new HttpError(404, 'Task not found')
  return task
}

export interface ListTasksFilter {
  projectId?: string
  status?: StatusValue
  dateFrom?: Date
  dateTo?: Date
}

export async function listTasks(prisma: PrismaClient, filter: ListTasksFilter = {}): Promise<TaskDTO[]> {
  const tasks = await prisma.task.findMany({
    where: {
      projectId: filter.projectId,
      status: filter.status,
      date:
        filter.dateFrom || filter.dateTo
          ? { gte: filter.dateFrom, lte: filter.dateTo }
          : undefined
    },
    include: taskInclude,
    orderBy: [{ date: 'asc' }, { order: 'asc' }]
  })
  return Promise.all(tasks.map((task) => attachComputedFields(prisma, task)))
}

export async function getTask(prisma: PrismaClient, id: string): Promise<TaskDTO> {
  const task = await getTaskRecordOrThrow(prisma, id)
  return attachComputedFields(prisma, task)
}

export interface CreateTaskInput {
  title: string
  description?: string
  projectId: string
  date: string
  startDate?: string
  endDate?: string
  status?: StatusValue
  order?: number
  comment?: EditorJsOutputData
}

export async function createTask(prisma: PrismaClient, input: CreateTaskInput): Promise<TaskDTO> {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } })
  if (!project) throw new HttpError(404, 'Project not found')

  assertCommentIfRequired(input.status, input.comment)

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      date: new Date(input.date),
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      status: input.status ?? 'QUEUED',
      order: input.order ?? 0,
      completedAt: input.status === 'DONE' ? new Date() : undefined
    },
    include: taskInclude
  })

  if (input.comment) {
    await prisma.taskComment.create({
      data: { taskId: task.id, content: serializeEditorJsContent(input.comment) }
    })
  }

  return attachComputedFields(prisma, task)
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  projectId?: string
  date?: string
  startDate?: string | null
  endDate?: string | null
  status?: StatusValue
  order?: number
  comment?: EditorJsOutputData
}

export async function updateTask(prisma: PrismaClient, id: string, input: UpdateTaskInput): Promise<TaskDTO> {
  const existing = await getTaskRecordOrThrow(prisma, id)

  if (input.projectId) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } })
    if (!project) throw new HttpError(404, 'Project not found')
  }

  const isStatusChange = Boolean(input.status) && input.status !== existing.status
  if (isStatusChange) {
    assertCommentIfRequired(input.status, input.comment)
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      date: input.date ? new Date(input.date) : undefined,
      startDate:
        input.startDate === undefined ? undefined : input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate === undefined ? undefined : input.endDate ? new Date(input.endDate) : null,
      status: input.status,
      order: input.order,
      completedAt: isStatusChange ? (input.status === 'DONE' ? new Date() : null) : undefined
    },
    include: taskInclude
  })

  if (isStatusChange && input.comment) {
    await prisma.taskComment.create({
      data: { taskId: task.id, content: serializeEditorJsContent(input.comment) }
    })
  }

  return attachComputedFields(prisma, task)
}

export async function deleteTask(prisma: PrismaClient, id: string): Promise<void> {
  await getTaskRecordOrThrow(prisma, id)
  await prisma.task.delete({ where: { id } })
}

export interface TaskCommentDTO {
  id: string
  taskId: string
  content: EditorJsOutputData
  createdAt: string
  updatedAt: string
}

export async function listTaskComments(prisma: PrismaClient, taskId: string): Promise<TaskCommentDTO[]> {
  await getTaskRecordOrThrow(prisma, taskId)
  const comments = await prisma.taskComment.findMany({ where: { taskId }, orderBy: { createdAt: 'asc' } })
  return comments.map((comment) => ({
    id: comment.id,
    taskId: comment.taskId,
    content: deserializeEditorJsContent(comment.content),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString()
  }))
}

export async function addTaskComment(
  prisma: PrismaClient,
  taskId: string,
  content: EditorJsOutputData
): Promise<TaskCommentDTO> {
  await getTaskRecordOrThrow(prisma, taskId)
  const comment = await prisma.taskComment.create({
    data: { taskId, content: serializeEditorJsContent(content) }
  })
  return {
    id: comment.id,
    taskId: comment.taskId,
    content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString()
  }
}
