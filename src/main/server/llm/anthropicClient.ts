import type { PrismaClient } from '../db'
import { HttpError } from '../middleware/errorHandler'
import { AGENT_TOOLS, describeToolCall, executeTool } from './tools'

const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOOL_ITERATIONS = 8
const MAX_TOKENS = 4096

export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: AnthropicContentBlock[]
}

interface AnthropicMessagesResponse {
  content: AnthropicContentBlock[]
  stop_reason: string | null
}

const SYSTEM_PROMPT = `You are the planning assistant embedded in a personal task manager app.
Tasks belong to projects, are scheduled on a date, can have subtasks (a checklist), dependencies on
other tasks, and one of these statuses: QUEUED, IN_PROGRESS, BLOCKED, PAUSED, POSTPONED, DONE.

Rules you must follow:
- Setting a task or subtask's status to BLOCKED, PAUSED, or POSTPONED requires a "comment" argument
  explaining what happened. If a tool call fails because a comment is missing, ask the user what
  happened (or infer it from context) and retry with a comment.
- To split a large task into smaller pieces, create subtasks under it rather than new top-level tasks.
- To plan someone's day, update tasks' "date" and "order" fields; to reflect what's actively being
  worked on, set status to IN_PROGRESS (this is what shows in the "Doing" kanban column, while QUEUED/
  BLOCKED/PAUSED/POSTPONED tasks scheduled for today show in "Next").
- Prefer looking up real project/task IDs with list_projects/list_tasks before creating or editing
  things, rather than guessing IDs.
- Be concise in your replies; you're a working assistant, not a chatbot.`

async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<AnthropicMessagesResponse> {
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages
      })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new HttpError(502, `Could not reach the agent provider at ${baseUrl}: ${message}`)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new HttpError(502, `Agent provider returned ${response.status}: ${text.slice(0, 500)}`)
  }

  return (await response.json()) as AnthropicMessagesResponse
}

export interface ToolLoopEvent {
  role: 'assistant' | 'tool'
  content: AnthropicContentBlock[]
}

export interface ToolLoopResult {
  events: ToolLoopEvent[]
  reply: string
  actions: string[]
}

/**
 * Runs the standard Anthropic tool-use loop: send the conversation, execute any
 * tool_use blocks the model asks for against our services, feed tool_results
 * back, and repeat until the model returns a final text-only reply.
 */
export async function runToolLoop(
  prisma: PrismaClient,
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<ToolLoopResult> {
  const events: ToolLoopEvent[] = []
  const actions: string[] = []
  const conversation = [...messages]

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await callAnthropic(baseUrl, apiKey, model, conversation)
    conversation.push({ role: 'assistant', content: response.content })
    events.push({ role: 'assistant', content: response.content })

    const toolUses = response.content.filter(
      (block): block is Extract<AnthropicContentBlock, { type: 'tool_use' }> => block.type === 'tool_use'
    )

    if (toolUses.length === 0) {
      const reply = response.content
        .filter((block): block is Extract<AnthropicContentBlock, { type: 'text' }> => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim()
      return { events, reply, actions }
    }

    const toolResults: AnthropicContentBlock[] = []
    for (const toolUse of toolUses) {
      try {
        const result = await executeTool(prisma, toolUse.name, toolUse.input)
        actions.push(describeToolCall(toolUse.name, toolUse.input))
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) })
      } catch (error) {
        const message = error instanceof HttpError || error instanceof Error ? error.message : String(error)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: message,
          is_error: true
        })
      }
    }

    conversation.push({ role: 'user', content: toolResults })
    events.push({ role: 'tool', content: toolResults })
  }

  throw new HttpError(502, 'The agent took too many steps without finishing. Try a smaller request.')
}
