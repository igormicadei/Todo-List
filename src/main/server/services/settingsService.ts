import type { PrismaClient, Settings } from '../db'

export interface PublicSettings {
  agentBaseUrl: string | null
  agentModel: string | null
  hasAgentApiKey: boolean
}

async function ensureSettingsRow(prisma: PrismaClient): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (existing) return existing
  return prisma.settings.create({ data: { id: 'default' } })
}

function toPublic(settings: Settings): PublicSettings {
  return {
    agentBaseUrl: settings.agentBaseUrl,
    agentModel: settings.agentModel,
    hasAgentApiKey: Boolean(settings.agentApiKey)
  }
}

export async function getPublicSettings(prisma: PrismaClient): Promise<PublicSettings> {
  return toPublic(await ensureSettingsRow(prisma))
}

/** Full row, including the raw agent API key — used only by the agent's LLM client, never returned over HTTP. */
export async function getFullSettings(prisma: PrismaClient): Promise<Settings> {
  return ensureSettingsRow(prisma)
}

export interface UpdateSettingsInput {
  agentBaseUrl?: string | null
  agentApiKey?: string | null
  agentModel?: string | null
}

export async function updateSettings(prisma: PrismaClient, input: UpdateSettingsInput): Promise<PublicSettings> {
  await ensureSettingsRow(prisma)
  const settings = await prisma.settings.update({ where: { id: 'default' }, data: input })
  return toPublic(settings)
}
