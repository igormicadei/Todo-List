import type { PrismaClient } from '@prisma/client'

export interface ProgressSummary {
  date: string
  total: number
  done: number
  percent: number
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

export async function getProgressForDate(prisma: PrismaClient, date: Date): Promise<ProgressSummary> {
  const start = startOfDay(date)
  const end = endOfDay(date)
  const tasks = await prisma.task.findMany({
    where: { date: { gte: start, lte: end } },
    select: { status: true }
  })
  const total = tasks.length
  const done = tasks.filter((task) => task.status === 'DONE').length
  return {
    date: start.toISOString(),
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100)
  }
}
