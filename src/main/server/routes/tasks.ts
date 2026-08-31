import { Router } from 'express'
import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../utils/asyncHandler'
import {
  addDependencySchema,
  changeStatusSchema,
  createCommentSchema,
  createSubtaskSchema,
  createTaskSchema,
  statusSchema,
  updateTaskSchema
} from '../types/validation'
import * as taskService from '../services/taskService'
import * as subtaskService from '../services/subtaskService'
import * as dependencyService from '../services/dependencyService'

const listQuerySchema = z.object({
  projectId: z.string().optional(),
  status: statusSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
})

export function createTasksRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = listQuerySchema.parse(req.query)
      const tasks = await taskService.listTasks(prisma, {
        projectId: query.projectId,
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined
      })
      res.json(tasks)
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const data = createTaskSchema.parse(req.body)
      res.status(201).json(await taskService.createTask(prisma, data))
    })
  )

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await taskService.getTask(prisma, req.params.id))
    })
  )

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const data = updateTaskSchema.parse(req.body)
      res.json(await taskService.updateTask(prisma, req.params.id, data))
    })
  )

  router.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
      const data = changeStatusSchema.parse(req.body)
      res.json(await taskService.updateTask(prisma, req.params.id, data))
    })
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await taskService.deleteTask(prisma, req.params.id)
      res.status(204).send()
    })
  )

  router.get(
    '/:id/comments',
    asyncHandler(async (req, res) => {
      res.json(await taskService.listTaskComments(prisma, req.params.id))
    })
  )

  router.post(
    '/:id/comments',
    asyncHandler(async (req, res) => {
      const data = createCommentSchema.parse(req.body)
      res.status(201).json(await taskService.addTaskComment(prisma, req.params.id, data.content))
    })
  )

  router.get(
    '/:id/dependencies',
    asyncHandler(async (req, res) => {
      res.json(await dependencyService.listDependencies(prisma, req.params.id))
    })
  )

  router.post(
    '/:id/dependencies',
    asyncHandler(async (req, res) => {
      const data = addDependencySchema.parse(req.body)
      await dependencyService.addDependency(prisma, req.params.id, data.dependsOnId)
      res.status(201).json(await dependencyService.listDependencies(prisma, req.params.id))
    })
  )

  router.delete(
    '/:id/dependencies/:dependsOnId',
    asyncHandler(async (req, res) => {
      await dependencyService.removeDependency(prisma, req.params.id, req.params.dependsOnId)
      res.status(204).send()
    })
  )

  router.get(
    '/:id/subtasks',
    asyncHandler(async (req, res) => {
      res.json(await subtaskService.listSubtasks(prisma, req.params.id))
    })
  )

  router.post(
    '/:id/subtasks',
    asyncHandler(async (req, res) => {
      const data = createSubtaskSchema.parse(req.body)
      res.status(201).json(await subtaskService.createSubtask(prisma, req.params.id, data))
    })
  )

  return router
}
