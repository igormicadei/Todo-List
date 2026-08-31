import type { PrismaClient, Subtask } from '@prisma/client'
import { HttpError } from '../middleware/errorHandler'
import { STATUSES_REQUIRING_COMMENT, type StatusValue } from '../types/status'
import {
  deserializeEditorJsContent,
  editorJsContentToPlainText,
  serializeEditorJsContent,
  type EditorJsOutputData
} from '../utils/editorjs'

export interface SubtaskDTO {
  id: string
  taskId: string
  title: string
  status: StatusValue
  order: number
  createdAt: string
  updatedAt: string
}

function toDTO(subtask: Subtask): SubtaskDTO {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    title: subtask.title,
    status: subtask.status as StatusValue,
    order: subtask.order,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString()
  }
}

function assertCommentIfRequired(status: StatusValue | undefined, comment: EditorJsOutputData | undefined): void {
  if (!status || !STATUSES_REQUIRING_COMMENT.has(status)) return
  const text = comment ? editorJsContentToPlainText(comment) : ''
  if (!text) {
    throw new HttpError(400, `A comment explaining what happened is required when setting status to ${status}.`)
  }
}

async function getSubtaskOrThrow(prisma: PrismaClient, id: string): Promise<Subtask> {
  const subtask = await prisma.subtask.findUnique({ where: { id } })
  if (!subtask) throw new HttpError(404, 'Subtask not found')
  return subtask
}

export async function listSubtasks(prisma: PrismaClient, taskId: string): Promise<SubtaskDTO[]> {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) throw new HttpError(404, 'Task not found')
  const subtasks = await prisma.subtask.findMany({ where: { taskId }, orderBy: { order: 'asc' } })
  return subtasks.map(toDTO)
}

export interface CreateSubtaskInput {
  title: string
  status?: StatusValue
  order?: number
  comment?: EditorJsOutputData
}

export async function createSubtask(
  prisma: PrismaClient,
  taskId: string,
  input: CreateSubtaskInput
): Promise<SubtaskDTO> {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) throw new HttpError(404, 'Task not found')

  assertCommentIfRequired(input.status, input.comment)

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: input.title,
      status: input.status ?? 'QUEUED',
      order: input.order ?? 0
    }
  })

  if (input.comment) {
    await prisma.subtaskComment.create({
      data: { subtaskId: subtask.id, content: serializeEditorJsContent(input.comment) }
    })
  }

  return toDTO(subtask)
}

export interface UpdateSubtaskInput {
  title?: string
  status?: StatusValue
  order?: number
  comment?: EditorJsOutputData
}

export async function updateSubtask(
  prisma: PrismaClient,
  id: string,
  input: UpdateSubtaskInput
): Promise<SubtaskDTO> {
  const existing = await getSubtaskOrThrow(prisma, id)

  const isStatusChange = Boolean(input.status) && input.status !== existing.status
  if (isStatusChange) {
    assertCommentIfRequired(input.status, input.comment)
  }

  const subtask = await prisma.subtask.update({
    where: { id },
    data: {
      title: input.title,
      status: input.status,
      order: input.order
    }
  })

  if (isStatusChange && input.comment) {
    await prisma.subtaskComment.create({
      data: { subtaskId: subtask.id, content: serializeEditorJsContent(input.comment) }
    })
  }

  return toDTO(subtask)
}

export async function deleteSubtask(prisma: PrismaClient, id: string): Promise<void> {
  await getSubtaskOrThrow(prisma, id)
  await prisma.subtask.delete({ where: { id } })
}

export interface SubtaskCommentDTO {
  id: string
  subtaskId: string
  content: EditorJsOutputData
  createdAt: string
  updatedAt: string
}

export async function listSubtaskComments(prisma: PrismaClient, subtaskId: string): Promise<SubtaskCommentDTO[]> {
  await getSubtaskOrThrow(prisma, subtaskId)
  const comments = await prisma.subtaskComment.findMany({
    where: { subtaskId },
    orderBy: { createdAt: 'asc' }
  })
  return comments.map((comment) => ({
    id: comment.id,
    subtaskId: comment.subtaskId,
    content: deserializeEditorJsContent(comment.content),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString()
  }))
}

export async function addSubtaskComment(
  prisma: PrismaClient,
  subtaskId: string,
  content: EditorJsOutputData
): Promise<SubtaskCommentDTO> {
  await getSubtaskOrThrow(prisma, subtaskId)
  const comment = await prisma.subtaskComment.create({
    data: { subtaskId, content: serializeEditorJsContent(content) }
  })
  return {
    id: comment.id,
    subtaskId: comment.subtaskId,
    content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString()
  }
}
