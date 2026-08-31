import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer, type View, type EventProps } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { Task } from '../api/types'
import type { CalendarViewMode } from '../state/uiStore'

const locales = { 'en-US': enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales
})

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: Task
}

interface CalendarViewProps {
  tasks: Task[]
  view: CalendarViewMode
  date: Date
  onNavigate: (date: Date) => void
  onSelectEvent?: (task: Task) => void
}

function EventItem({ event }: EventProps<CalendarEvent>): JSX.Element {
  const task = event.resource as Task
  return (
    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      <strong>{task.project.name}:</strong> {task.title}
    </div>
  )
}

export function CalendarView({ tasks, view, date, onNavigate, onSelectEvent }: CalendarViewProps): JSX.Element {
  const events = useMemo<CalendarEvent[]>(
    () =>
      tasks.map((task) => {
        const start = new Date(task.date)
        return { id: task.id, title: task.title, start, end: start, allDay: true, resource: task }
      }),
    [tasks]
  )

  return (
    <div style={{ height: 700 }}>
      <Calendar
        localizer={localizer}
        events={events}
        view={view as View}
        date={date}
        onNavigate={onNavigate}
        views={['day', 'week', 'month']}
        toolbar={false}
        popup
        components={{ event: EventItem }}
        eventPropGetter={(event) => {
          const task = (event as CalendarEvent).resource
          return {
            style: {
              backgroundColor: task.project.color,
              borderColor: task.project.color
            }
          }
        }}
        onSelectEvent={(event) => onSelectEvent?.((event as CalendarEvent).resource)}
      />
    </div>
  )
}
