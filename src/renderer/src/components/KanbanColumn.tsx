import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Tag } from '@carbon/react'
import type { Task } from '../api/types'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  id: 'next' | 'doing'
  title: string
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

export function KanbanColumn({ id, title, tasks, onTaskClick }: KanbanColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${id}` })

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? 'var(--cds-layer-hover, #e8e8e8)' : 'var(--cds-layer, #f4f4f4)',
        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
        borderRadius: 4,
        padding: '0.75rem',
        minHeight: 220
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0 }}>{title}</h4>
        <Tag type="gray" size="sm">
          {tasks.length}
        </Tag>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--cds-text-secondary, #525252)', fontSize: '0.875rem' }}>Nothing here.</p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />)
        )}
      </SortableContext>
    </div>
  )
}
