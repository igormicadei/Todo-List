import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer as createHttpServer } from 'http'
import type { PrismaClient } from '@prisma/client'
import { createPrismaClient } from './db'
import { createAuthMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'

export interface ServerOptions {
  dbPath: string
  apiToken: string
  port: number
}

export interface RunningServer {
  app: Express
  prisma: PrismaClient
  port: number
  close: () => Promise<void>
}

export function createApp(dbPath: string, apiToken: string): { app: Express; prisma: PrismaClient } {
  const prisma = createPrismaClient(dbPath)
  const app = express()

  app.use(cors())
  app.use(helmet())
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  const api = express.Router()
  api.use(createAuthMiddleware(apiToken))
  // Resource routers (projects, tasks, subtasks, dependencies, comments,
  // views, settings, agent) are mounted here.
  app.use('/api', api)

  app.use(errorHandler)

  return { app, prisma }
}

export function startServer(options: ServerOptions): Promise<RunningServer> {
  const { app, prisma } = createApp(options.dbPath, options.apiToken)
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
