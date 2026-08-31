import type { PrismaClient } from '@prisma/client'
import { HttpError } from '../middleware/errorHandler'
import * as settingsService from './settingsService'
import { runToolLoop, type AnthropicContentBlock, type ChatMessage } from '../llm/anthropicClient'

const DEFAULT_BASE_URL = 'https://api.anthropic.com'
const DEFAULT_MODEL = 'claude-sonnet-5'

export interface AgentMessageDTO {
  id: string
  role: string
  content: AnthropicContentBlock[]
  createdAt: string
}

/** Both plain user turns and relayed tool results are "user" turns from the API's point of view. */
function toApiRole(role: string): 'user' | 'assistant' {
  return role === 'assistant' ? 'assistant' : 'user'
}

async function loadHistory(
  prisma: PrismaClient
): Promise<{ dbMessages: AgentMessageDTO[]; apiMessages: ChatMessage[] }> {
  const rows = await prisma.agentMessage.findMany({ orderBy: { createdAt: 'asc' } })
  const dbMessages = rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: JSON.parse(row.content) as AnthropicContentBlock[],
    createdAt: row.createdAt.toISOString()
  }))
  const apiMessages = dbMessages.map((message) => ({
    role: toApiRole(message.role),
    content: message.content
  }))
  return { dbMessages, apiMessages }
}

async function persist(prisma: PrismaClient, role: string, content: AnthropicContentBlock[]): Promise<void> {
  await prisma.agentMessage.create({ data: { role, content: JSON.stringify(content) } })
}

export async function listMessages(prisma: PrismaClient): Promise<AgentMessageDTO[]> {
  return (await loadHistory(prisma)).dbMessages
}

export interface SendMessageResult {
  reply: string
  actions: string[]
}

export async function sendMessage(prisma: PrismaClient, userText: string): Promise<SendMessageResult> {
  const settings = await settingsService.getFullSettings(prisma)
  if (!settings.agentApiKey) {
    throw new HttpError(
      400,
      'The agent is not configured yet. Add an API key in Settings before starting a chat.'
    )
  }

  const { apiMessages } = await loadHistory(prisma)
  const userContent: AnthropicContentBlock[] = [{ type: 'text', text: userText }]
  await persist(prisma, 'user', userContent)
  apiMessages.push({ role: 'user', content: userContent })

  const baseUrl = settings.agentBaseUrl || DEFAULT_BASE_URL
  const model = settings.agentModel || DEFAULT_MODEL

  const result = await runToolLoop(prisma, baseUrl, settings.agentApiKey, model, apiMessages)

  for (const event of result.events) {
    await persist(prisma, event.role, event.content)
  }

  return { reply: result.reply, actions: result.actions }
}

export async function resetConversation(prisma: PrismaClient): Promise<void> {
  await prisma.agentMessage.deleteMany({})
}
