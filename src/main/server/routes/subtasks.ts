import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../utils/asyncHandler'
import { changeStatusSchema, createCommentSchema, updateSubtaskSchema } from '../types/validation'
import * as subtaskService from '../services/subtaskService'

export function createSubtasksRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const data = updateSubtaskSchema.parse(req.body)
      res.json(await subtaskService.updateSubtask(prisma, req.params.id, data))
    })
  )

  router.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
      const data = changeStatusSchema.parse(req.body)
      res.json(await subtaskService.updateSubtask(prisma, req.params.id, data))
    })
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await subtaskService.deleteSubtask(prisma, req.params.id)
      res.status(204).send()
    })
  )

  router.get(
    '/:id/comments',
    asyncHandler(async (req, res) => {
      res.json(await subtaskService.listSubtaskComments(prisma, req.params.id))
    })
  )

  router.post(
    '/:id/comments',
    asyncHandler(async (req, res) => {
      const data = createCommentSchema.parse(req.body)
      res.status(201).json(await subtaskService.addSubtaskComment(prisma, req.params.id, data.content))
    })
  )

  return router
}
