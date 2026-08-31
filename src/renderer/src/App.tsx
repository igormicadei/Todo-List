import { HashRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@carbon/react'
import { queryClient } from './state/queryClient'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { CalendarPage } from './pages/CalendarPage'
import { GanttPage } from './pages/GanttPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'

function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme theme="g10">
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/gantt" element={<GanttPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </Theme>
    </QueryClientProvider>
  )
}

export default App
