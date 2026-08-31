import type { NextFunction, Request, Response } from 'express'

export function createAuthMiddleware(apiToken: string) {
  return function auth(req: Request, res: Response, next: NextFunction): void {
    const header = req.header('authorization')
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
    if (!token || token !== apiToken) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    next()
  }
}
