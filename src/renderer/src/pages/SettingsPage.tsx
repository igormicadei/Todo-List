import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, InlineNotification, PasswordInput, TextInput, Tile } from '@carbon/react'
import { Copy, Renew } from '@carbon/icons-react'
import * as api from '../api/client'
import { setApiToken as setCachedApiToken } from '../api/config'

export function SettingsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: () => api.getSettings() })
  const tokenQuery = useQuery({ queryKey: ['api-token'], queryFn: () => api.getApiToken() })

  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settingsQuery.data) {
      setBaseUrl(settingsQuery.data.agentBaseUrl ?? '')
      setModel(settingsQuery.data.agentModel ?? '')
    }
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateSettings({
        agentBaseUrl: baseUrl.trim() || null,
        agentModel: model.trim() || null,
        ...(apiKeyInput.trim() ? { agentApiKey: apiKeyInput.trim() } : {})
      }),
    onSuccess: () => {
      setApiKeyInput('')
      setSavedMessage('Settings saved.')
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
    }
  })

  const regenerateMutation = useMutation({
    mutationFn: () => api.regenerateApiToken(),
    onSuccess: (result) => {
      setCachedApiToken(result.apiToken)
      void queryClient.invalidateQueries({ queryKey: ['api-token'] })
    }
  })

  async function copyToken(): Promise<void> {
    if (tokenQuery.data) {
      await navigator.clipboard.writeText(tokenQuery.data.apiToken)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 640 }}>
      <h2 style={{ margin: 0 }}>Settings</h2>

      <Tile>
        <h4 style={{ marginBottom: '1rem' }}>AI agent</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            id="agent-base-url"
            labelText="Base URL"
            placeholder="https://api.anthropic.com"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
          <TextInput
            id="agent-model"
            labelText="Model"
            placeholder="claude-sonnet-5"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
          <PasswordInput
            id="agent-api-key"
            labelText="API key"
            placeholder={
              settingsQuery.data?.hasAgentApiKey ? 'Key set — enter a new one to replace it' : 'sk-ant-…'
            }
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
          />
          <div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save
            </Button>
          </div>
          {savedMessage && (
            <InlineNotification
              kind="success"
              title={savedMessage}
              hideCloseButton
              lowContrast
              onClose={() => setSavedMessage(null)}
            />
          )}
        </div>
      </Tile>

      <Tile>
        <h4 style={{ marginBottom: '1rem' }}>API access</h4>
        <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--cds-text-secondary, #525252)' }}>
          Other applications on this machine can control this app through its local REST API, using this token as
          a Bearer token against the server this app is running on.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <TextInput id="api-token" labelText="API token" readOnly value={tokenQuery.data?.apiToken ?? ''} />
          <Button
            kind="tertiary"
            size="md"
            hasIconOnly
            iconDescription="Copy"
            renderIcon={Copy}
            onClick={() => void copyToken()}
          />
          <Button
            kind="danger--tertiary"
            size="md"
            renderIcon={Renew}
            onClick={() => {
              if (
                window.confirm(
                  'Regenerate the API token? Any other application using the old token will need to be updated.'
                )
              ) {
                regenerateMutation.mutate()
              }
            }}
          >
            Regenerate
          </Button>
        </div>
      </Tile>
    </div>
  )
}
