import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths
} from 'date-fns'
import { Button, ContentSwitcher, Switch, InlineLoading, InlineNotification } from '@carbon/react'
import { ChevronLeft, ChevronRight } from '@carbon/icons-react'
import * as api from '../api/client'
import { CalendarView } from '../components/CalendarView'
import { useUiStore, type CalendarViewMode } from '../state/uiStore'

function getRange(view: CalendarViewMode, date: Date): { from: Date; to: Date } {
  if (view === 'day') return { from: startOfDay(date), to: endOfDay(date) }
  if (view === 'week') return { from: startOfWeek(date), to: endOfWeek(date) }
  return { from: startOfWeek(startOfMonth(date)), to: endOfWeek(endOfMonth(date)) }
}

function shiftDate(view: CalendarViewMode, date: Date, direction: 1 | -1): Date {
  if (view === 'day') return direction === 1 ? addDays(date, 1) : subDays(date, 1)
  if (view === 'week') return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1)
  return direction === 1 ? addMonths(date, 1) : subMonths(date, 1)
}

const VIEW_ORDER: CalendarViewMode[] = ['day', 'week', 'month']

export function CalendarPage(): JSX.Element {
  const openTask = useUiStore((state) => state.openTask)
  const selectedDate = useUiStore((state) => state.selectedDate)
  const setSelectedDate = useUiStore((state) => state.setSelectedDate)
  const calendarView = useUiStore((state) => state.calendarView)
  const setCalendarView = useUiStore((state) => state.setCalendarView)

  const { from, to } = useMemo(() => getRange(calendarView, selectedDate), [calendarView, selectedDate])

  const tasksQuery = useQuery({
    queryKey: ['calendar', from.toISOString(), to.toISOString()],
    queryFn: () => api.getCalendarView(from.toISOString(), to.toISOString())
  })

  const heading =
    calendarView === 'day'
      ? format(selectedDate, 'EEEE, MMMM d, yyyy')
      : calendarView === 'week'
        ? `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
        : format(selectedDate, 'MMMM yyyy')

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
        <h2 style={{ margin: 0 }}>Calendar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button kind="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription="Previous"
            renderIcon={ChevronLeft}
            onClick={() => setSelectedDate(shiftDate(calendarView, selectedDate, -1))}
          />
          <span style={{ minWidth: 200, textAlign: 'center', fontWeight: 600 }}>{heading}</span>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription="Next"
            renderIcon={ChevronRight}
            onClick={() => setSelectedDate(shiftDate(calendarView, selectedDate, 1))}
          />
          <div style={{ width: 264 }}>
            <ContentSwitcher
              size="sm"
              selectedIndex={VIEW_ORDER.indexOf(calendarView)}
              onChange={({ name }) => setCalendarView(name as CalendarViewMode)}
            >
              <Switch name="day" text="Day" />
              <Switch name="week" text="Week" />
              <Switch name="month" text="Month" />
            </ContentSwitcher>
          </div>
        </div>
      </div>

      {tasksQuery.error && (
        <InlineNotification
          kind="error"
          title="Couldn't load calendar"
          subtitle={tasksQuery.error instanceof Error ? tasksQuery.error.message : 'Unknown error'}
          hideCloseButton
        />
      )}
      {!tasksQuery.data && !tasksQuery.error && <InlineLoading description="Loading calendar…" />}
      {tasksQuery.data && (
        <CalendarView
          tasks={tasksQuery.data}
          view={calendarView}
          date={selectedDate}
          onNavigate={setSelectedDate}
          onSelectEvent={(task) => openTask(task.id)}
        />
      )}
    </div>
  )
}
