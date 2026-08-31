export type StatusValue = 'QUEUED' | 'IN_PROGRESS' | 'BLOCKED' | 'PAUSED' | 'POSTPONED' | 'DONE'

export const STATUS_VALUES: StatusValue[] = ['QUEUED', 'IN_PROGRESS', 'BLOCKED', 'PAUSED', 'POSTPONED', 'DONE']

export const STATUSES_REQUIRING_COMMENT: ReadonlySet<StatusValue> = new Set(['BLOCKED', 'PAUSED', 'POSTPONED'])

export interface Project {
  id: string
  name: string
  color: string
  description: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface EditorJsBlock {
  type: string
  data: Record<string, unknown>
}

export interface EditorJsOutputData {
  time?: number
  version?: string
  blocks: EditorJsBlock[]
}

export interface DependencySummary {
  id: string
  title: string
  status: StatusValue
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: StatusValue
  date: string
  startDate: string | null
  endDate: string | null
  order: number
  completedAt: string | null
  projectId: string
  project: { id: string; name: string; color: string }
  createdAt: string
  updatedAt: string
  blockedByDependencies: boolean
  blockingTasks: DependencySummary[]
  subtaskProgress: { total: number; done: number }
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  status: StatusValue
  order: number
  createdAt: string
  updatedAt: string
}

export interface TaskComment {
  id: string
  taskId: string
  content: EditorJsOutputData
  createdAt: string
  updatedAt: string
}

export interface SubtaskComment {
  id: string
  subtaskId: string
  content: EditorJsOutputData
  createdAt: string
  updatedAt: string
}

export interface KanbanView {
  next: Task[]
  doing: Task[]
}

export interface GanttView {
  tasks: Task[]
  dependencies: Array<{ taskId: string; dependsOnId: string }>
}

export interface ProgressSummary {
  date: string
  total: number
  done: number
  percent: number
}

export interface PublicSettings {
  agentBaseUrl: string | null
  agentModel: string | null
  hasAgentApiKey: boolean
}

export interface AgentMessageContentBlock {
  type: string
  text?: string
  name?: string
  input?: Record<string, unknown>
  content?: string
  is_error?: boolean
}

export interface AgentMessage {
  id: string
  role: string
  content: AgentMessageContentBlock[]
  createdAt: string
}
