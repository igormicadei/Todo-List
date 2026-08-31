import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'

// Fleshed out in the agent/LLM integration milestone (tool-use loop against
// the configured Anthropic-compatible endpoint). Present now only so the
// router tree mounts cleanly.
export function createAgentRouter(_prisma: PrismaClient): Router {
  const router = Router()

  router.post('/chat', (_req, res) => {
    res.status(501).json({ error: 'Agent chat is not implemented yet' })
  })

  router.post('/reset', (_req, res) => {
    res.status(501).json({ error: 'Agent chat is not implemented yet' })
  })

  return router
}
