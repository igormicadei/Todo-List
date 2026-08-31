import { z } from 'zod'
import { STATUS_VALUES } from './status'

export const statusSchema = z.enum(STATUS_VALUES)

export const editorJsBlockSchema = z
  .object({
    type: z.string(),
    data: z.record(z.unknown())
  })
  .passthrough()

export const editorJsContentSchema = z.object({
  time: z.number().optional(),
  version: z.string().optional(),
  blocks: z.array(editorJsBlockSchema)
})

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date' })

export const createProjectSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1).optional(),
  description: z.string().optional()
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  description: z.string().optional(),
  archived: z.boolean().optional()
})

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().min(1),
  date: dateStringSchema,
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  status: statusSchema.optional(),
  order: z.number().int().optional(),
  comment: editorJsContentSchema.optional()
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  projectId: z.string().min(1).optional(),
  date: dateStringSchema.optional(),
  startDate: dateStringSchema.nullable().optional(),
  endDate: dateStringSchema.nullable().optional(),
  status: statusSchema.optional(),
  order: z.number().int().optional(),
  comment: editorJsContentSchema.optional()
})

export const changeStatusSchema = z.object({
  status: statusSchema,
  comment: editorJsContentSchema.optional()
})

export const createSubtaskSchema = z.object({
  title: z.string().min(1),
  status: statusSchema.optional(),
  order: z.number().int().optional(),
  comment: editorJsContentSchema.optional()
})

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: statusSchema.optional(),
  order: z.number().int().optional(),
  comment: editorJsContentSchema.optional()
})

export const createCommentSchema = z.object({
  content: editorJsContentSchema
})

export const addDependencySchema = z.object({
  dependsOnId: z.string().min(1)
})

export const settingsSchema = z.object({
  agentBaseUrl: z.string().url().nullable().optional(),
  agentApiKey: z.string().min(1).nullable().optional(),
  agentModel: z.string().min(1).nullable().optional()
})
