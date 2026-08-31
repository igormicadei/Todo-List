import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Tag } from '@carbon/react'
import { CheckmarkFilled, WarningAltFilled } from '@carbon/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/client'
import type { Task } from '../api/types'
import { StatusTag } from './StatusTag'
import { ProjectBadge } from './ProjectBadge'

interface TaskCardProps {
  task: Task
  onClick?: () => void
  dragOverlay?: boolean
}

export function TaskCard({ task, onClick, dragOverlay = false }: TaskCardProps): JSX.Element {
  const queryClient = useQueryClient()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragOverlay
  })

  const completeMutation = useMutation({
    mutationFn: () => api.changeTaskStatus(task.id, 'DONE'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban'] })
      void queryClient.invalidateQueries({ queryKey: ['progress'] })
    }
  })

  const style = dragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1
      }

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      className="task-card"
      style={{
        background: 'var(--cds-background, #ffffff)',
        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
        borderRadius: 4,
        padding: '0.75rem',
        marginBottom: '0.5rem',
        cursor: onClick ? 'pointer' : 'grab',
        ...style
      }}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <strong style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}>{task.title}</strong>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          iconDescription="Mark done"
          renderIcon={CheckmarkFilled}
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            completeMutation.mutate()
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.5rem', alignItems: 'center' }}>
        <ProjectBadge name={task.project.name} color={task.project.color} />
        <StatusTag status={task.status} />
        {task.blockedByDependencies && (
          <Tag type="red" size="sm" renderIcon={WarningAltFilled}>
            Blocked by dependency
          </Tag>
        )}
        {task.subtaskProgress.total > 0 && (
          <Tag type="gray" size="sm">
            {task.subtaskProgress.done}/{task.subtaskProgress.total} subtasks
          </Tag>
        )}
      </div>
    </div>
  )
}
