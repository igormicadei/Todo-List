import { Router } from 'express'
import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../utils/asyncHandler'
import * as agentService from '../services/agentService'

const chatSchema = z.object({ message: z.string().min(1) })

export function createAgentRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/messages',
    asyncHandler(async (_req, res) => {
      res.json(await agentService.listMessages(prisma))
    })
  )

  router.post(
    '/chat',
    asyncHandler(async (req, res) => {
      const { message } = chatSchema.parse(req.body)
      res.json(await agentService.sendMessage(prisma, message))
    })
  )

  router.post(
    '/reset',
    asyncHandler(async (_req, res) => {
      await agentService.resetConversation(prisma)
      res.status(204).send()
    })
  )

  return router
}
