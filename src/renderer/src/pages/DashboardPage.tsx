import { useQuery } from '@tanstack/react-query'
import { InlineLoading, InlineNotification } from '@carbon/react'
import * as api from '../api/client'
import { TodayProgress } from '../components/TodayProgress'
import { KanbanBoard } from '../components/KanbanBoard'
import { useUiStore } from '../state/uiStore'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export function DashboardPage(): JSX.Element {
  const openTask = useUiStore((state) => state.openTask)
  const progressQuery = useQuery({ queryKey: ['progress'], queryFn: () => api.getProgress() })
  const kanbanQuery = useQuery({ queryKey: ['kanban'], queryFn: () => api.getKanbanView() })

  if (progressQuery.error || kanbanQuery.error) {
    return (
      <InlineNotification
        kind="error"
        title="Couldn't load today's tasks"
        subtitle={errorMessage(progressQuery.error ?? kanbanQuery.error)}
        hideCloseButton
      />
    )
  }

  if (!progressQuery.data || !kanbanQuery.data) {
    return <InlineLoading description="Loading today's tasks…" />
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Today</h2>
      <div style={{ marginBottom: '2rem', maxWidth: 480 }}>
        <TodayProgress progress={progressQuery.data} />
      </div>
      <KanbanBoard
        next={kanbanQuery.data.next}
        doing={kanbanQuery.data.doing}
        onTaskClick={(task) => openTask(task.id)}
      />
    </div>
  )
}
