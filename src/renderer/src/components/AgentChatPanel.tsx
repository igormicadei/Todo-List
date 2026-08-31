import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, InlineLoading, InlineNotification, TextArea } from '@carbon/react'
import { Close } from '@carbon/icons-react'
import * as api from '../api/client'
import { ApiError } from '../api/client'
import { useUiStore } from '../state/uiStore'
import type { AgentMessageContentBlock } from '../api/types'

function describeToolUse(block: AgentMessageContentBlock): string {
  const input = block.input ?? {}
  const label = (input.title as string | undefined) ?? (input.name as string | undefined) ?? (input.id as string | undefined)
  return label ? `${block.name}: ${label}` : (block.name ?? 'tool call')
}

function invalidateAppData(queryClient: ReturnType<typeof useQueryClient>): void {
  for (const key of ['kanban', 'progress', 'calendar', 'gantt', 'projects-page', 'projects', 'tasks-all']) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}

export function AgentChatPanel(): JSX.Element | null {
  const open = useUiStore((state) => state.agentPanelOpen)
  const close = useUiStore((state) => state.closeAgentPanel)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const messagesQuery = useQuery({
    queryKey: ['agent-messages'],
    queryFn: () => api.listAgentMessages(),
    enabled: open
  })

  const sendMutation = useMutation({
    mutationFn: (message: string) => api.sendAgentMessage(message),
    onSuccess: () => {
      setDraft('')
      setErrorMessage(null)
      void queryClient.invalidateQueries({ queryKey: ['agent-messages'] })
      invalidateAppData(queryClient)
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong talking to the agent.')
    }
  })

  const resetMutation = useMutation({
    mutationFn: () => api.resetAgentConversation(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['agent-messages'] })
  })

  if (!open) return null

  const bubbles = (messagesQuery.data ?? [])
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: message.id,
      role: message.role,
      text: message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n'),
      actions: message.content.filter((block) => block.type === 'tool_use').map(describeToolUse)
    }))
    .filter((message) => message.text || message.actions.length > 0)

  function handleSend(): void {
    const text = draft.trim()
    if (!text || sendMutation.isPending) return
    sendMutation.mutate(text)
  }

  return (
    <div className="app-shell__side-panel">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)'
        }}
      >
        <h4 style={{ margin: 0 }}>Agent</h4>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <Button kind="ghost" size="sm" onClick={() => resetMutation.mutate()}>
            Reset
          </Button>
          <Button kind="ghost" size="sm" hasIconOnly iconDescription="Close" renderIcon={Close} onClick={close} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {bubbles.length === 0 && !messagesQuery.isLoading && (
          <p style={{ color: 'var(--cds-text-secondary, #525252)', fontSize: '0.875rem' }}>
            Ask me to plan your day, reorganize the board, or split a big task into subtasks.
          </p>
        )}
        {bubbles.map((bubble) => (
          <div key={bubble.id} style={{ alignSelf: bubble.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
            <div
              style={{
                background: bubble.role === 'user' ? 'var(--cds-background-selected, #e0e0e0)' : 'var(--cds-layer, #f4f4f4)',
                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                borderRadius: 8,
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap'
              }}
            >
              {bubble.text}
            </div>
            {bubble.actions.length > 0 && (
              <ul
                style={{
                  marginTop: '0.25rem',
                  paddingLeft: '1.25rem',
                  fontSize: '0.75rem',
                  color: 'var(--cds-text-secondary, #525252)'
                }}
              >
                {bubble.actions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {sendMutation.isPending && <InlineLoading description="Thinking…" />}
      </div>

      {errorMessage && (
        <div style={{ padding: '0 1rem' }}>
          <InlineNotification
            kind="error"
            title="Agent error"
            subtitle={errorMessage}
            hideCloseButton
            lowContrast
          />
        </div>
      )}

      <div style={{ padding: '1rem', borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', display: 'flex', gap: '0.5rem' }}>
        <TextArea
          id="agent-message"
          labelText="Message"
          hideLabel
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSend()
            }
          }}
        />
        <Button onClick={handleSend} disabled={!draft.trim() || sendMutation.isPending}>
          Send
        </Button>
      </div>
    </div>
  )
}
