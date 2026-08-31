import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, TextInput } from '@carbon/react'
import { ChevronRight, TrashCan } from '@carbon/icons-react'
import * as api from '../api/client'
import type { EditorJsOutputData, StatusValue, Subtask } from '../api/types'
import { StatusTag } from './StatusTag'
import { StatusChangeControl } from './StatusChangeControl'
import { CommentThread } from './CommentThread'

interface SubtaskChecklistProps {
  taskId: string
}

export function SubtaskChecklist({ taskId }: SubtaskChecklistProps): JSX.Element {
  const queryClient = useQueryClient()
  const [newTitle, setNewTitle] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const subtasksQuery = useQuery({ queryKey: ['subtasks', taskId], queryFn: () => api.listSubtasks(taskId) })

  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] })
    void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
  }

  const createMutation = useMutation({
    mutationFn: (title: string) => api.createSubtask(taskId, { title }),
    onSuccess: () => {
      setNewTitle('')
      invalidate()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSubtask(id),
    onSuccess: invalidate
  })

  const subtasks = subtasksQuery.data ?? []
  const done = subtasks.filter((subtask) => subtask.status === 'DONE').length

  function submitNewSubtask(): void {
    const title = newTitle.trim()
    if (title) createMutation.mutate(title)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h5 style={{ margin: 0 }}>Subtasks</h5>
        {subtasks.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary, #525252)' }}>
            {done}/{subtasks.length} done
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {subtasks.map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            expanded={expandedId === subtask.id}
            onToggleExpand={() => setExpandedId(expandedId === subtask.id ? null : subtask.id)}
            onDelete={() => deleteMutation.mutate(subtask.id)}
            onStatusChanged={invalidate}
          />
        ))}
        {subtasks.length === 0 && (
          <p style={{ color: 'var(--cds-text-secondary, #525252)', fontSize: '0.875rem' }}>No subtasks yet.</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <TextInput
          id={`new-subtask-${taskId}`}
          labelText="Add subtask"
          hideLabel
          placeholder="Add a subtask…"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitNewSubtask()
          }}
        />
        <Button size="md" onClick={submitNewSubtask} disabled={!newTitle.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}

interface SubtaskRowProps {
  subtask: Subtask
  expanded: boolean
  onToggleExpand: () => void
  onDelete: () => void
  onStatusChanged: () => void
}

function SubtaskRow({ subtask, expanded, onToggleExpand, onDelete, onStatusChanged }: SubtaskRowProps): JSX.Element {
  const queryClient = useQueryClient()
  const commentsQuery = useQuery({
    queryKey: ['subtask-comments', subtask.id],
    queryFn: () => api.listSubtaskComments(subtask.id),
    enabled: expanded
  })

  async function handleStatusChange(status: StatusValue, comment?: EditorJsOutputData): Promise<void> {
    await api.changeSubtaskStatus(subtask.id, status, comment)
    onStatusChanged()
    if (comment) void queryClient.invalidateQueries({ queryKey: ['subtask-comments', subtask.id] })
  }

  async function handleAddComment(content: EditorJsOutputData): Promise<void> {
    await api.addSubtaskComment(subtask.id, content)
    void queryClient.invalidateQueries({ queryKey: ['subtask-comments', subtask.id] })
  }

  return (
    <div
      style={{
        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
        borderRadius: 4,
        padding: '0.5rem 0.75rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer' }}
          onClick={onToggleExpand}
        >
          <ChevronRight
            size={16}
            style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.1s' }}
          />
          <span style={{ fontSize: '0.875rem' }}>{subtask.title}</span>
          <StatusTag status={subtask.status} />
        </div>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          iconDescription="Delete subtask"
          renderIcon={TrashCan}
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            onDelete()
          }}
        />
      </div>
      {expanded && (
        <div style={{ marginTop: '0.75rem', paddingLeft: '1.5rem' }}>
          <StatusChangeControl id={subtask.id} status={subtask.status} onChange={handleStatusChange} />
          <div style={{ marginTop: '0.75rem' }}>
            <CommentThread comments={commentsQuery.data ?? []} onSubmit={handleAddComment} />
          </div>
        </div>
      )}
    </div>
  )
}
