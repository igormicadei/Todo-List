import { useRef, useState } from 'react'
import { Button, Dropdown } from '@carbon/react'
import { RichTextEditor, type RichTextEditorHandle } from './RichTextEditor'
import { STATUS_LABELS, STATUS_VALUES, STATUSES_REQUIRING_COMMENT, type EditorJsOutputData, type StatusValue } from '../api/types'

interface StatusChangeControlProps {
  id: string
  status: StatusValue
  onChange: (status: StatusValue, comment?: EditorJsOutputData) => Promise<void>
}

export function StatusChangeControl({ id, status, onChange }: StatusChangeControlProps): JSX.Element {
  const [pendingStatus, setPendingStatus] = useState<StatusValue | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const editorRef = useRef<RichTextEditorHandle>(null)

  async function commitChange(newStatus: StatusValue, comment?: EditorJsOutputData): Promise<void> {
    setIsSubmitting(true)
    try {
      await onChange(newStatus, comment)
      setPendingStatus(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSelect(newStatus: StatusValue): void {
    if (newStatus === status) return
    if (STATUSES_REQUIRING_COMMENT.has(newStatus)) {
      setPendingStatus(newStatus)
    } else {
      void commitChange(newStatus)
    }
  }

  async function handleConfirmWithComment(): Promise<void> {
    if (!pendingStatus) return
    const data = await editorRef.current?.save()
    if (!data || data.blocks.length === 0) return
    await commitChange(pendingStatus, data)
  }

  return (
    <div>
      <Dropdown
        id={`status-dropdown-${id}`}
        titleText="Status"
        label="Status"
        items={STATUS_VALUES}
        itemToString={(item) => (item ? STATUS_LABELS[item] : '')}
        selectedItem={status}
        onChange={({ selectedItem }) => selectedItem && handleSelect(selectedItem)}
        disabled={isSubmitting}
      />
      {pendingStatus && (
        <div
          style={{
            marginTop: '0.75rem',
            border: '1px solid var(--cds-support-error, #da1e28)',
            borderRadius: 4,
            padding: '0.75rem'
          }}
        >
          <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Setting status to <strong>{STATUS_LABELS[pendingStatus]}</strong> requires a comment explaining what
            happened.
          </p>
          <RichTextEditor ref={editorRef} placeholder="What happened?" minHeight={100} />
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button kind="ghost" size="sm" onClick={() => setPendingStatus(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleConfirmWithComment()} disabled={isSubmitting}>
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
