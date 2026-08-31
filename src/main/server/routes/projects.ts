import { Router } from 'express'
import type { PrismaClient } from '../db'
import { asyncHandler } from '../utils/asyncHandler'
import { createProjectSchema, updateProjectSchema } from '../types/validation'
import * as projectService from '../services/projectService'

export function createProjectsRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const includeArchived = req.query.includeArchived === 'true'
      res.json(await projectService.listProjects(prisma, { includeArchived }))
    })
  )

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await projectService.getProject(prisma, req.params.id))
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const data = createProjectSchema.parse(req.body)
      res.status(201).json(await projectService.createProject(prisma, data))
    })
  )

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const data = updateProjectSchema.parse(req.body)
      res.json(await projectService.updateProject(prisma, req.params.id, data))
    })
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await projectService.deleteProject(prisma, req.params.id)
      res.status(204).send()
    })
  )

  return router
}
