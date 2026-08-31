import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import * as api from '../api/client'
import type { StatusValue, Task } from '../api/types'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'

interface KanbanBoardProps {
  next: Task[]
  doing: Task[]
  onTaskClick?: (task: Task) => void
}

type ColumnId = 'next' | 'doing'

const COLUMN_STATUS: Record<ColumnId, StatusValue> = {
  next: 'QUEUED',
  doing: 'IN_PROGRESS'
}

export function KanbanBoard({ next, doing, onTaskClick }: KanbanBoardProps): JSX.Element {
  const queryClient = useQueryClient()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const columns: Record<ColumnId, Task[]> = { next, doing }

  function findColumnOf(taskId: string): ColumnId | undefined {
    if (next.some((task) => task.id === taskId)) return 'next'
    if (doing.some((task) => task.id === taskId)) return 'doing'
    return undefined
  }

  function handleDragStart(event: DragStartEvent): void {
    const task = [...next, ...doing].find((candidate) => candidate.id === event.active.id)
    setActiveTask(task ?? null)
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const fromColumn = findColumnOf(String(active.id))
    if (!fromColumn) return

    const overId = String(over.id)
    const toColumn = overId.startsWith('column:')
      ? (overId.replace('column:', '') as ColumnId)
      : findColumnOf(overId)
    if (!toColumn) return

    if (fromColumn !== toColumn) {
      await api.changeTaskStatus(String(active.id), COLUMN_STATUS[toColumn])
      await queryClient.invalidateQueries({ queryKey: ['kanban'] })
      await queryClient.invalidateQueries({ queryKey: ['progress'] })
      return
    }

    const items = columns[fromColumn]
    const oldIndex = items.findIndex((task) => task.id === active.id)
    const newIndex = items.findIndex((task) => task.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    await Promise.all(reordered.map((task, index) => api.updateTask(task.id, { order: index })))
    await queryClient.invalidateQueries({ queryKey: ['kanban'] })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <KanbanColumn id="next" title="Next" tasks={next} onTaskClick={onTaskClick} />
        <KanbanColumn id="doing" title="Doing" tasks={doing} onTaskClick={onTaskClick} />
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} dragOverlay /> : null}</DragOverlay>
    </DndContext>
  )
}
