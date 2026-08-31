import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  ComposedModal,
  Dropdown,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput
} from '@carbon/react'
import { TrashCan } from '@carbon/icons-react'
import * as api from '../api/client'
import { useUiStore } from '../state/uiStore'
import type { EditorJsOutputData, StatusValue } from '../api/types'
import { StatusChangeControl } from './StatusChangeControl'
import { DependencyPicker } from './DependencyPicker'
import { SubtaskChecklist } from './SubtaskChecklist'
import { CommentThread } from './CommentThread'
import { DateField } from './DateField'

export function TaskDetailPanel(): JSX.Element {
  const openTaskId = useUiStore((state) => state.openTaskId)
  const closeTask = useUiStore((state) => state.closeTask)
  const queryClient = useQueryClient()

  const taskQuery = useQuery({
    queryKey: ['task', openTaskId],
    queryFn: () => api.getTask(openTaskId as string),
    enabled: Boolean(openTaskId)
  })
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => api.listProjects() })
  const commentsQuery = useQuery({
    queryKey: ['task-comments', openTaskId],
    queryFn: () => api.listTaskComments(openTaskId as string),
    enabled: Boolean(openTaskId)
  })

  const [title, setTitle] = useState('')

  useEffect(() => {
    if (taskQuery.data) setTitle(taskQuery.data.title)
  }, [taskQuery.data])

  function invalidateTask(): void {
    void queryClient.invalidateQueries({ queryKey: ['task', openTaskId] })
    void queryClient.invalidateQueries({ queryKey: ['kanban'] })
    void queryClient.invalidateQueries({ queryKey: ['progress'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['gantt'] })
  }

  const updateMutation = useMutation({
    mutationFn: (input: api.UpdateTaskInput) => api.updateTask(openTaskId as string, input),
    onSuccess: invalidateTask
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteTask(openTaskId as string),
    onSuccess: () => {
      invalidateTask()
      closeTask()
    }
  })

  async function handleStatusChange(status: StatusValue, comment?: EditorJsOutputData): Promise<void> {
    await api.changeTaskStatus(openTaskId as string, status, comment)
    invalidateTask()
    if (comment) void queryClient.invalidateQueries({ queryKey: ['task-comments', openTaskId] })
  }

  async function handleAddComment(content: EditorJsOutputData): Promise<void> {
    await api.addTaskComment(openTaskId as string, content)
    void queryClient.invalidateQueries({ queryKey: ['task-comments', openTaskId] })
  }

  const task = taskQuery.data
  const projects = projectsQuery.data ?? []

  return (
    <ComposedModal
      open={Boolean(openTaskId)}
      onClose={() => {
        closeTask()
        return true
      }}
      size="lg"
    >
      <ModalHeader
        label={task ? task.project.name : 'Task'}
        title={task ? task.title : 'Loading…'}
        closeModal={() => closeTask()}
      />
      <ModalBody hasForm>
        {!task && <InlineLoading description="Loading task…" />}
        {task && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <TextInput
              id="task-title"
              labelText="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                const trimmed = title.trim()
                if (trimmed && trimmed !== task.title) updateMutation.mutate({ title: trimmed })
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Dropdown
                id="task-project"
                titleText="Project"
                label="Project"
                items={projects}
                itemToString={(item) => item?.name ?? ''}
                selectedItem={projects.find((project) => project.id === task.projectId) ?? null}
                onChange={({ selectedItem }) => {
                  if (selectedItem) updateMutation.mutate({ projectId: selectedItem.id })
                }}
              />
              <DateField
                id="task-date"
                label="Scheduled date"
                value={task.date}
                onChange={(value) => value && updateMutation.mutate({ date: value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <DateField
                id="task-start"
                label="Gantt start (optional)"
                value={task.startDate}
                onChange={(value) => updateMutation.mutate({ startDate: value })}
              />
              <DateField
                id="task-end"
                label="Gantt end (optional)"
                value={task.endDate}
                onChange={(value) => updateMutation.mutate({ endDate: value })}
              />
            </div>

            <StatusChangeControl id={task.id} status={task.status} onChange={handleStatusChange} />

            {task.blockedByDependencies && (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title="Blocked by dependency"
                subtitle={`Waiting on: ${task.blockingTasks.map((blocker) => blocker.title).join(', ')}`}
              />
            )}

            <DependencyPicker taskId={task.id} />

            <SubtaskChecklist taskId={task.id} />

            <div>
              <h5 style={{ marginBottom: '0.5rem' }}>Comments &amp; updates</h5>
              <CommentThread comments={commentsQuery.data ?? []} onSubmit={handleAddComment} />
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          kind="danger--ghost"
          renderIcon={TrashCan}
          onClick={() => {
            if (window.confirm('Delete this task? This cannot be undone.')) deleteMutation.mutate()
          }}
        >
          Delete task
        </Button>
        <Button kind="secondary" onClick={() => closeTask()}>
          Close
        </Button>
      </ModalFooter>
    </ComposedModal>
  )
}
