import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../utils/asyncHandler'
import { settingsSchema } from '../types/validation'
import * as settingsService from '../services/settingsService'
import type { TokenStore } from '../tokenStore'

export interface SettingsRouterDeps {
  prisma: PrismaClient
  tokenStore: TokenStore
  regenerateToken: () => string
}

export function createSettingsRouter(deps: SettingsRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await settingsService.getPublicSettings(deps.prisma))
    })
  )

  router.put(
    '/',
    asyncHandler(async (req, res) => {
      const data = settingsSchema.parse(req.body)
      res.json(await settingsService.updateSettings(deps.prisma, data))
    })
  )

  router.get(
    '/token',
    asyncHandler(async (_req, res) => {
      res.json({ apiToken: deps.tokenStore.getToken() })
    })
  )

  router.post(
    '/token/regenerate',
    asyncHandler(async (_req, res) => {
      const apiToken = deps.regenerateToken()
      deps.tokenStore.setToken(apiToken)
      res.json({ apiToken })
    })
  )

  return router
}
