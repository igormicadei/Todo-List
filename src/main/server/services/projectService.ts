import type { PrismaClient, Project } from '../db'
import { HttpError } from '../middleware/errorHandler'

export async function listProjects(
  prisma: PrismaClient,
  options: { includeArchived?: boolean } = {}
): Promise<Project[]> {
  return prisma.project.findMany({
    where: options.includeArchived ? {} : { archived: false },
    orderBy: { name: 'asc' }
  })
}

export async function getProject(prisma: PrismaClient, id: string): Promise<Project> {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new HttpError(404, 'Project not found')
  return project
}

export interface CreateProjectInput {
  name: string
  color?: string
  description?: string
}

export async function createProject(prisma: PrismaClient, input: CreateProjectInput): Promise<Project> {
  return prisma.project.create({ data: input })
}

export interface UpdateProjectInput {
  name?: string
  color?: string
  description?: string
  archived?: boolean
}

export async function updateProject(
  prisma: PrismaClient,
  id: string,
  input: UpdateProjectInput
): Promise<Project> {
  await getProject(prisma, id)
  return prisma.project.update({ where: { id }, data: input })
}

export async function deleteProject(prisma: PrismaClient, id: string): Promise<void> {
  await getProject(prisma, id)
  await prisma.project.delete({ where: { id } })
}
