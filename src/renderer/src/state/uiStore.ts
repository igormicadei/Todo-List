import { create } from 'zustand'

export type CalendarViewMode = 'day' | 'week' | 'month'

interface UiState {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  calendarView: CalendarViewMode
  setCalendarView: (view: CalendarViewMode) => void
  agentPanelOpen: boolean
  toggleAgentPanel: () => void
  closeAgentPanel: () => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
  calendarView: 'month',
  setCalendarView: (view) => set({ calendarView: view }),
  agentPanelOpen: false,
  toggleAgentPanel: () => set((state) => ({ agentPanelOpen: !state.agentPanelOpen })),
  closeAgentPanel: () => set({ agentPanelOpen: false })
}))
