import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ViewMode } from 'gantt-task-react'
import { ContentSwitcher, InlineLoading, InlineNotification, Switch } from '@carbon/react'
import * as api from '../api/client'
import { GanttView } from '../components/GanttView'

const VIEW_MODES: Array<{ name: string; mode: ViewMode }> = [
  { name: 'day', mode: ViewMode.Day },
  { name: 'week', mode: ViewMode.Week },
  { name: 'month', mode: ViewMode.Month }
]

export function GanttPage(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const ganttQuery = useQuery({ queryKey: ['gantt'], queryFn: () => api.getGanttView() })

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <h2 style={{ margin: 0 }}>Gantt</h2>
        <div style={{ width: 264 }}>
          <ContentSwitcher
            size="sm"
            selectedIndex={VIEW_MODES.findIndex((entry) => entry.mode === viewMode)}
            onChange={({ name }) => {
              const found = VIEW_MODES.find((entry) => entry.name === name)
              if (found) setViewMode(found.mode)
            }}
          >
            <Switch name="day" text="Day" />
            <Switch name="week" text="Week" />
            <Switch name="month" text="Month" />
          </ContentSwitcher>
        </div>
      </div>

      {ganttQuery.error && (
        <InlineNotification
          kind="error"
          title="Couldn't load gantt data"
          subtitle={ganttQuery.error instanceof Error ? ganttQuery.error.message : 'Unknown error'}
          hideCloseButton
        />
      )}
      {!ganttQuery.data && !ganttQuery.error && <InlineLoading description="Loading tasks…" />}
      {ganttQuery.data && <GanttView data={ganttQuery.data} viewMode={viewMode} />}
    </div>
  )
}
