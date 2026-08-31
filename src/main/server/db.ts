import { app } from 'electron'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import type {
  PrismaClient as PrismaClientType,
  Project as ProjectType,
  Settings as SettingsType,
  Subtask as SubtaskType,
  Task as TaskType
} from '../../../generated/prisma-client'

export type { PrismaClientType as PrismaClient, ProjectType as Project, SettingsType as Settings, SubtaskType as Subtask, TaskType as Task }

/**
 * The generated client lives outside node_modules (see prisma/schema.prisma's
 * generator `output`) specifically so it never depends on the conventional
 * node_modules/.prisma/client location — electron-builder's file packaging
 * silently drops dot-prefixed directories, which broke the packaged app at
 * runtime. Loaded here by an explicit path (dev: repo root; packaged:
 * electron-builder.yml ships it as an extraResource) rather than through
 * Node's node_modules resolution, so packaging specifics can't affect it.
 *
 * The dev-mode path is computed from this bundle's own file location rather
 * than app.getAppPath() — that call's return value depends on *how* Electron
 * was launched (it resolves differently for `electron .` vs `electron
 * out/main/index.js`, the latter being how electron-vite's dev command
 * actually launches it), so it isn't reliable here.
 */
function resolveGeneratedClientDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'prisma-client')
  }
  const bundleDir = path.dirname(fileURLToPath(import.meta.url))
  return path.join(bundleDir, '../../generated/prisma-client')
}

const require = createRequire(import.meta.url)
const generatedClient = require(resolveGeneratedClientDir()) as { PrismaClient: new (...args: unknown[]) => PrismaClientType }
const { PrismaClient } = generatedClient

export function createPrismaClient(dbPath: string): PrismaClientType {
  return new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`
      }
    }
  })
}
