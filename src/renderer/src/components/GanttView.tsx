import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { addDays } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/client'
import type { GanttView as GanttViewData } from '../api/types'

interface GanttViewProps {
  data: GanttViewData
  viewMode: ViewMode
  onTaskClick?: (taskId: string) => void
}

function toGanttTasks(data: GanttViewData): GanttTask[] {
  const dependsOnByTask = new Map<string, string[]>()
  for (const edge of data.dependencies) {
    const list = dependsOnByTask.get(edge.taskId) ?? []
    list.push(edge.dependsOnId)
    dependsOnByTask.set(edge.taskId, list)
  }

  return data.tasks.map((task) => {
    const start = new Date(task.startDate ?? task.date)
    let end = new Date(task.endDate ?? task.date)
    if (end.getTime() <= start.getTime()) end = addDays(start, 1)

    const progress =
      task.status === 'DONE'
        ? 100
        : task.status === 'IN_PROGRESS'
          ? 50
          : task.subtaskProgress.total > 0
            ? Math.round((task.subtaskProgress.done / task.subtaskProgress.total) * 100)
            : 0

    return {
      id: task.id,
      type: 'task',
      name: `${task.project.name}: ${task.title}`,
      start,
      end,
      progress,
      dependencies: dependsOnByTask.get(task.id) ?? [],
      styles: {
        backgroundColor: task.project.color,
        backgroundSelectedColor: task.project.color,
        progressColor: 'rgba(0,0,0,0.35)',
        progressSelectedColor: 'rgba(0,0,0,0.45)'
      }
    }
  })
}

export function GanttView({ data, viewMode, onTaskClick }: GanttViewProps): JSX.Element {
  const queryClient = useQueryClient()
  const ganttTasks = toGanttTasks(data)

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, start, end }: { id: string; start: Date; end: Date }) =>
      api.updateTask(id, { startDate: start.toISOString(), endDate: end.toISOString() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gantt'] })
    }
  })

  if (ganttTasks.length === 0) {
    return <p>No tasks yet. Create tasks with a project and date to see them here.</p>
  }

  return (
    <Gantt
      tasks={ganttTasks}
      viewMode={viewMode}
      onDateChange={(task) => {
        rescheduleMutation.mutate({ id: task.id, start: task.start, end: task.end })
      }}
      onClick={(task) => onTaskClick?.(task.id)}
      listCellWidth="220px"
      columnWidth={viewMode === ViewMode.Month ? 200 : viewMode === ViewMode.Week ? 140 : 60}
    />
  )
}
