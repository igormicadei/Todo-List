import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer as createHttpServer } from 'http'
import type { PrismaClient } from './db'
import { createPrismaClient } from './db'
import { createAuthMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'
import { createTokenStore, type TokenStore } from './tokenStore'
import { createProjectsRouter } from './routes/projects'
import { createTasksRouter } from './routes/tasks'
import { createSubtasksRouter } from './routes/subtasks'
import { createViewsRouter } from './routes/views'
import { createSettingsRouter } from './routes/settings'
import { createAgentRouter } from './routes/agent'

export interface ServerOptions {
  dbPath: string
  apiToken: string
  port: number
  /** Persists a freshly generated token to disk and returns it; called from the Settings "regenerate" action. */
  regenerateToken: () => string
}

export interface RunningServer {
  app: Express
  prisma: PrismaClient
  port: number
  close: () => Promise<void>
}

export function createApp(
  dbPath: string,
  apiToken: string,
  regenerateToken: () => string
): { app: Express; prisma: PrismaClient; tokenStore: TokenStore } {
  const prisma = createPrismaClient(dbPath)
  const tokenStore = createTokenStore(apiToken)
  const app = express()

  app.use(cors())
  app.use(helmet())
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  const api = express.Router()
  api.use(createAuthMiddleware(tokenStore))
  api.use('/projects', createProjectsRouter(prisma))
  api.use('/tasks', createTasksRouter(prisma))
  api.use('/subtasks', createSubtasksRouter(prisma))
  api.use('/views', createViewsRouter(prisma))
  api.use('/settings', createSettingsRouter({ prisma, tokenStore, regenerateToken }))
  api.use('/agent', createAgentRouter(prisma))
  app.use('/api', api)

  app.use(errorHandler)

  return { app, prisma, tokenStore }
}

export function startServer(options: ServerOptions): Promise<RunningServer> {
  const { app, prisma } = createApp(options.dbPath, options.apiToken, options.regenerateToken)
  return new Promise((resolve, reject) => {
    const httpServer = createHttpServer(app)
    httpServer.on('error', reject)
    httpServer.listen(options.port, '127.0.0.1', () => {
      resolve({
        app,
        prisma,
        port: options.port,
        close: () =>
          new Promise((res) => {
            httpServer.close(() => {
              prisma.$disconnect().finally(res)
            })
          })
      })
    })
  })
}
