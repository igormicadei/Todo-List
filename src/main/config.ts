import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

export interface AppConfig {
  port: number
  apiToken: string
  dbPath: string
}

const DEFAULT_PORT = 4317

export function getAppDataDir(): string {
  const dir = join(app.getPath('userData'), 'todo-list')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function configFilePath(): string {
  return join(getAppDataDir(), 'config.json')
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

function writeConfig(config: AppConfig): void {
  writeFileSync(configFilePath(), JSON.stringify(config, null, 2))
}

export function loadOrCreateConfig(): AppConfig {
  const path = configFilePath()
  let config: Partial<AppConfig> = {}
  if (existsSync(path)) {
    config = JSON.parse(readFileSync(path, 'utf-8'))
  }

  const resolved: AppConfig = {
    port: config.port ?? DEFAULT_PORT,
    apiToken: config.apiToken ?? generateToken(),
    dbPath: config.dbPath ?? join(getAppDataDir(), 'app.db')
  }

  writeConfig(resolved)
  return resolved
}

export function regenerateApiToken(): string {
  const config = loadOrCreateConfig()
  config.apiToken = generateToken()
  writeConfig(config)
  return config.apiToken
}

/** Resolves the bundled Prisma migration SQL files, in dev or packaged. */
export function getMigrationsDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'prisma', 'migrations')
  }
  return join(__dirname, '../../prisma/migrations')
}
