import { getApiConfig } from './config'
import type {
  AgentMessage,
  DependencySummary,
  EditorJsOutputData,
  GanttView,
  KanbanView,
  Project,
  ProgressSummary,
  PublicSettings,
  StatusValue,
  Subtask,
  SubtaskComment,
  Task,
  TaskComment
} from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiBaseUrl, apiToken } = getApiConfig()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers
    }
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const data: unknown = text ? JSON.parse(text) : undefined

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : response.statusText
    throw new ApiError(response.status, message)
  }

  return data as T
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  if (entries.length === 0) return ''
  return `?${new URLSearchParams(entries).toString()}`
}

// Projects
export function listProjects(includeArchived = false): Promise<Project[]> {
  return request(`/api/projects${qs({ includeArchived: includeArchived ? 'true' : undefined })}`)
}
export function getProject(id: string): Promise<Project> {
  return request(`/api/projects/${id}`)
}
export function createProject(input: { name: string; color?: string; description?: string }): Promise<Project> {
  return request('/api/projects', { method: 'POST', body: JSON.stringify(input) })
}
export function updateProject(
  id: string,
  input: Partial<{ name: string; color: string; description: string; archived: boolean }>
): Promise<Project> {
  return request(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}
export function deleteProject(id: string): Promise<void> {
  return request(`/api/projects/${id}`, { method: 'DELETE' })
}

// Tasks
export interface ListTasksParams {
  projectId?: string
  status?: StatusValue
  dateFrom?: string
  dateTo?: string
}
export function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  return request(`/api/tasks${qs(params as Record<string, string | undefined>)}`)
}
export function getTask(id: string): Promise<Task> {
  return request(`/api/tasks/${id}`)
}
export interface CreateTaskInput {
  title: string
  description?: string
  projectId: string
  date: string
  startDate?: string
  endDate?: string
  status?: StatusValue
  order?: number
  comment?: EditorJsOutputData
}
export function createTask(input: CreateTaskInput): Promise<Task> {
  return request('/api/tasks', { method: 'POST', body: JSON.stringify(input) })
}
export type UpdateTaskInput = Partial<CreateTaskInput>
export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return request(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}
export function changeTaskStatus(id: string, status: StatusValue, comment?: EditorJsOutputData): Promise<Task> {
  return request(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, comment }) })
}
export function deleteTask(id: string): Promise<void> {
  return request(`/api/tasks/${id}`, { method: 'DELETE' })
}

// Task comments
export function listTaskComments(taskId: string): Promise<TaskComment[]> {
  return request(`/api/tasks/${taskId}/comments`)
}
export function addTaskComment(taskId: string, content: EditorJsOutputData): Promise<TaskComment> {
  return request(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) })
}

// Dependencies
export interface DependenciesResponse {
  dependsOn: DependencySummary[]
  dependents: DependencySummary[]
}
export function listDependencies(taskId: string): Promise<DependenciesResponse> {
  return request(`/api/tasks/${taskId}/dependencies`)
}
export function addDependency(taskId: string, dependsOnId: string): Promise<DependenciesResponse> {
  return request(`/api/tasks/${taskId}/dependencies`, { method: 'POST', body: JSON.stringify({ dependsOnId }) })
}
export function removeDependency(taskId: string, dependsOnId: string): Promise<void> {
  return request(`/api/tasks/${taskId}/dependencies/${dependsOnId}`, { method: 'DELETE' })
}

// Subtasks
export function listSubtasks(taskId: string): Promise<Subtask[]> {
  return request(`/api/tasks/${taskId}/subtasks`)
}
export interface CreateSubtaskInput {
  title: string
  status?: StatusValue
  order?: number
  comment?: EditorJsOutputData
}
export function createSubtask(taskId: string, input: CreateSubtaskInput): Promise<Subtask> {
  return request(`/api/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify(input) })
}
export type UpdateSubtaskInput = Partial<CreateSubtaskInput>
export function updateSubtask(id: string, input: UpdateSubtaskInput): Promise<Subtask> {
  return request(`/api/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}
export function changeSubtaskStatus(id: string, status: StatusValue, comment?: EditorJsOutputData): Promise<Subtask> {
  return request(`/api/subtasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, comment }) })
}
export function deleteSubtask(id: string): Promise<void> {
  return request(`/api/subtasks/${id}`, { method: 'DELETE' })
}
export function listSubtaskComments(subtaskId: string): Promise<SubtaskComment[]> {
  return request(`/api/subtasks/${subtaskId}/comments`)
}
export function addSubtaskComment(subtaskId: string, content: EditorJsOutputData): Promise<SubtaskComment> {
  return request(`/api/subtasks/${subtaskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) })
}

// Views
export function getCalendarView(from: string, to: string): Promise<Task[]> {
  return request(`/api/views/calendar${qs({ from, to })}`)
}
export function getKanbanView(date?: string): Promise<KanbanView> {
  return request(`/api/views/kanban${qs({ date })}`)
}
export function getGanttView(): Promise<GanttView> {
  return request('/api/views/gantt')
}
export function getProgress(date?: string): Promise<ProgressSummary> {
  return request(`/api/views/progress${qs({ date })}`)
}

// Settings
export function getSettings(): Promise<PublicSettings> {
  return request('/api/settings')
}
export function updateSettings(input: {
  agentBaseUrl?: string | null
  agentApiKey?: string | null
  agentModel?: string | null
}): Promise<PublicSettings> {
  return request('/api/settings', { method: 'PUT', body: JSON.stringify(input) })
}
export function getApiToken(): Promise<{ apiToken: string }> {
  return request('/api/settings/token')
}
export function regenerateApiToken(): Promise<{ apiToken: string }> {
  return request('/api/settings/token/regenerate', { method: 'POST' })
}

// Agent
export function listAgentMessages(): Promise<AgentMessage[]> {
  return request('/api/agent/messages')
}
export function sendAgentMessage(message: string): Promise<{ reply: string; actions: string[] }> {
  return request('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message }) })
}
export function resetAgentConversation(): Promise<void> {
  return request('/api/agent/reset', { method: 'POST' })
}
