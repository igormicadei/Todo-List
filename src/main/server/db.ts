import { PrismaClient } from '@prisma/client'

export function createPrismaClient(dbPath: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`
      }
    }
  })
}
