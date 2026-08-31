import type { NextFunction, Request, Response } from 'express'
import type { TokenStore } from '../tokenStore'

export function createAuthMiddleware(tokenStore: TokenStore) {
  return function auth(req: Request, res: Response, next: NextFunction): void {
    const header = req.header('authorization')
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
    if (!token || token !== tokenStore.getToken()) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    next()
  }
}
