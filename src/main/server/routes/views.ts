import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../utils/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import * as taskService from '../services/taskService'
import * as progressService from '../services/progressService'

function parseDateParam(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string' || value.length === 0) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, 'Invalid date')
  return parsed
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export function createViewsRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/calendar',
    asyncHandler(async (req, res) => {
      const from = parseDateParam(req.query.from, startOfDay(new Date()))
      const to = parseDateParam(req.query.to, endOfDay(new Date()))
      const tasks = await taskService.listTasks(prisma, {
        dateFrom: startOfDay(from),
        dateTo: endOfDay(to)
      })
      res.json(tasks)
    })
  )

  router.get(
    '/kanban',
    asyncHandler(async (req, res) => {
      const date = parseDateParam(req.query.date, new Date())
      const tasks = await taskService.listTasks(prisma, {
        dateFrom: startOfDay(date),
        dateTo: endOfDay(date)
      })
      const doing = tasks.filter((task) => task.status === 'IN_PROGRESS')
      const next = tasks.filter((task) => task.status !== 'IN_PROGRESS' && task.status !== 'DONE')
      res.json({ next, doing })
    })
  )

  router.get(
    '/gantt',
    asyncHandler(async (_req, res) => {
      const [tasks, dependencies] = await Promise.all([
        taskService.listTasks(prisma),
        prisma.taskDependency.findMany({ select: { taskId: true, dependsOnId: true } })
      ])
      res.json({ tasks, dependencies })
    })
  )

  router.get(
    '/progress',
    asyncHandler(async (req, res) => {
      const date = parseDateParam(req.query.date, new Date())
      res.json(await progressService.getProgressForDate(prisma, date))
    })
  )

  return router
}
