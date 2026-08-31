import type { PrismaClient } from '@prisma/client'
import { HttpError } from '../middleware/errorHandler'
import { STATUS_VALUES, type StatusValue } from '../types/status'
import { textToEditorJsContent } from '../utils/editorjs'
import * as projectService from '../services/projectService'
import * as taskService from '../services/taskService'
import * as subtaskService from '../services/subtaskService'
import * as dependencyService from '../services/dependencyService'

export interface AnthropicTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

const statusProperty = {
  type: 'string',
  enum: STATUS_VALUES as unknown as string[],
  description: 'QUEUED | IN_PROGRESS | BLOCKED | PAUSED | POSTPONED | DONE'
}

const commentProperty = {
  type: 'string',
  description: 'Required when status is BLOCKED, PAUSED, or POSTPONED: explain what happened.'
}

export const AGENT_TOOLS: AnthropicTool[] = [
  {
    name: 'list_projects',
    description: 'List all projects (optionally including archived ones).',
    input_schema: {
      type: 'object',
      properties: { includeArchived: { type: 'boolean', description: 'Defaults to false.' } }
    }
  },
  {
    name: 'create_project',
    description: 'Create a new project to group tasks under.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string', description: 'Hex color like #0f62fe for the project badge.' },
        description: { type: 'string' }
      },
      required: ['name']
    }
  },
  {
    name: 'update_project',
    description: "Update a project's name, color, description, or archived state.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
        description: { type: 'string' },
        archived: { type: 'boolean' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_project',
    description: 'Delete a project and all of its tasks. This cannot be undone.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
  },
  {
    name: 'list_tasks',
    description: 'List tasks, optionally filtered by project, status, or an inclusive ISO date range.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        status: statusProperty,
        dateFrom: { type: 'string', description: 'ISO date, inclusive lower bound.' },
        dateTo: { type: 'string', description: 'ISO date, inclusive upper bound.' }
      }
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task under a project, scheduled for a given date.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        projectId: { type: 'string' },
        date: { type: 'string', description: 'ISO date the task is scheduled for.' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        status: statusProperty,
        order: { type: 'number' },
        comment: commentProperty
      },
      required: ['title', 'projectId', 'date']
    }
  },
  {
    name: 'update_task',
    description:
      "Update a task's fields, including moving it to a different day/project/order or changing its status. " +
      "Use this to set today's plan (date + order) or move a card between the Next/Doing kanban columns " +
      '(QUEUED vs IN_PROGRESS).',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        projectId: { type: 'string' },
        date: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        status: statusProperty,
        order: { type: 'number' },
        comment: commentProperty
      },
      required: ['id']
    }
  },
  {
    name: 'delete_task',
    description: 'Delete a task. This cannot be undone.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
  },
  {
    name: 'add_task_dependency',
    description:
      'Mark a task as depending on another task; it will show as blocked until that task is DONE. Rejects cycles.',
    input_schema: {
      type: 'object',
      properties: { taskId: { type: 'string' }, dependsOnId: { type: 'string' } },
      required: ['taskId', 'dependsOnId']
    }
  },
  {
    name: 'remove_task_dependency',
    description: 'Remove a dependency between two tasks.',
    input_schema: {
      type: 'object',
      properties: { taskId: { type: 'string' }, dependsOnId: { type: 'string' } },
      required: ['taskId', 'dependsOnId']
    }
  },
  {
    name: 'add_task_comment',
    description: "Add a plain-text comment/update to a task's activity log.",
    input_schema: {
      type: 'object',
      properties: { taskId: { type: 'string' }, text: { type: 'string' } },
      required: ['taskId', 'text']
    }
  },
  {
    name: 'list_subtasks',
    description: 'List the checklist of subtasks under a task.',
    input_schema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] }
  },
  {
    name: 'create_subtask',
    description:
      'Add a subtask (checklist item) under a task. Use this to split a big task into smaller pieces.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        title: { type: 'string' },
        status: statusProperty,
        order: { type: 'number' },
        comment: commentProperty
      },
      required: ['taskId', 'title']
    }
  },
  {
    name: 'update_subtask',
    description: "Update a subtask's title, order, or status.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        status: statusProperty,
        order: { type: 'number' },
        comment: commentProperty
      },
      required: ['id']
    }
  },
  {
    name: 'delete_subtask',
    description: 'Delete a subtask.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
  }
]

type ToolInput = Record<string, unknown>

function str(input: ToolInput, key: string): string | undefined {
  const value = input[key]
  return typeof value === 'string' ? value : undefined
}

function num(input: ToolInput, key: string): number | undefined {
  const value = input[key]
  return typeof value === 'number' ? value : undefined
}

function bool(input: ToolInput, key: string): boolean | undefined {
  const value = input[key]
  return typeof value === 'boolean' ? value : undefined
}

function requireStr(input: ToolInput, key: string): string {
  const value = str(input, key)
  if (value === undefined) throw new HttpError(400, `Missing required argument: ${key}`)
  return value
}

function statusOf(input: ToolInput, key: string): StatusValue | undefined {
  return str(input, key) as StatusValue | undefined
}

function commentOf(input: ToolInput, key: string): ReturnType<typeof textToEditorJsContent> | undefined {
  const text = str(input, key)
  return text ? textToEditorJsContent(text) : undefined
}

export function describeToolCall(name: string, input: ToolInput): string {
  switch (name) {
    case 'create_project':
      return `Created project "${String(input.name)}"`
    case 'update_project':
      return `Updated project ${String(input.id)}`
    case 'delete_project':
      return `Deleted project ${String(input.id)}`
    case 'create_task':
      return `Created task "${String(input.title)}"`
    case 'update_task':
      return `Updated task ${String(input.id)}${input.status ? ` -> ${String(input.status)}` : ''}`
    case 'delete_task':
      return `Deleted task ${String(input.id)}`
    case 'add_task_dependency':
      return `Linked task ${String(input.taskId)} to depend on ${String(input.dependsOnId)}`
    case 'remove_task_dependency':
      return `Removed dependency: ${String(input.taskId)} no longer depends on ${String(input.dependsOnId)}`
    case 'add_task_comment':
      return `Commented on task ${String(input.taskId)}`
    case 'create_subtask':
      return `Added subtask "${String(input.title)}" to task ${String(input.taskId)}`
    case 'update_subtask':
      return `Updated subtask ${String(input.id)}${input.status ? ` -> ${String(input.status)}` : ''}`
    case 'delete_subtask':
      return `Deleted subtask ${String(input.id)}`
    default:
      return name
  }
}

export async function executeTool(prisma: PrismaClient, name: string, input: ToolInput): Promise<unknown> {
  switch (name) {
    case 'list_projects':
      return projectService.listProjects(prisma, { includeArchived: bool(input, 'includeArchived') })
    case 'create_project':
      return projectService.createProject(prisma, {
        name: requireStr(input, 'name'),
        color: str(input, 'color'),
        description: str(input, 'description')
      })
    case 'update_project':
      return projectService.updateProject(prisma, requireStr(input, 'id'), {
        name: str(input, 'name'),
        color: str(input, 'color'),
        description: str(input, 'description'),
        archived: bool(input, 'archived')
      })
    case 'delete_project':
      await projectService.deleteProject(prisma, requireStr(input, 'id'))
      return { deleted: true }
    case 'list_tasks':
      return taskService.listTasks(prisma, {
        projectId: str(input, 'projectId'),
        status: statusOf(input, 'status'),
        dateFrom: str(input, 'dateFrom') ? new Date(requireStr(input, 'dateFrom')) : undefined,
        dateTo: str(input, 'dateTo') ? new Date(requireStr(input, 'dateTo')) : undefined
      })
    case 'create_task':
      return taskService.createTask(prisma, {
        title: requireStr(input, 'title'),
        description: str(input, 'description'),
        projectId: requireStr(input, 'projectId'),
        date: requireStr(input, 'date'),
        startDate: str(input, 'startDate'),
        endDate: str(input, 'endDate'),
        status: statusOf(input, 'status'),
        order: num(input, 'order'),
        comment: commentOf(input, 'comment')
      })
    case 'update_task':
      return taskService.updateTask(prisma, requireStr(input, 'id'), {
        title: str(input, 'title'),
        description: str(input, 'description'),
        projectId: str(input, 'projectId'),
        date: str(input, 'date'),
        startDate: str(input, 'startDate'),
        endDate: str(input, 'endDate'),
        status: statusOf(input, 'status'),
        order: num(input, 'order'),
        comment: commentOf(input, 'comment')
      })
    case 'delete_task':
      await taskService.deleteTask(prisma, requireStr(input, 'id'))
      return { deleted: true }
    case 'add_task_dependency':
      await dependencyService.addDependency(prisma, requireStr(input, 'taskId'), requireStr(input, 'dependsOnId'))
      return { added: true }
    case 'remove_task_dependency':
      await dependencyService.removeDependency(prisma, requireStr(input, 'taskId'), requireStr(input, 'dependsOnId'))
      return { removed: true }
    case 'add_task_comment':
      return taskService.addTaskComment(
        prisma,
        requireStr(input, 'taskId'),
        textToEditorJsContent(requireStr(input, 'text'))
      )
    case 'list_subtasks':
      return subtaskService.listSubtasks(prisma, requireStr(input, 'taskId'))
    case 'create_subtask':
      return subtaskService.createSubtask(prisma, requireStr(input, 'taskId'), {
        title: requireStr(input, 'title'),
        status: statusOf(input, 'status'),
        order: num(input, 'order'),
        comment: commentOf(input, 'comment')
      })
    case 'update_subtask':
      return subtaskService.updateSubtask(prisma, requireStr(input, 'id'), {
        title: str(input, 'title'),
        status: statusOf(input, 'status'),
        order: num(input, 'order'),
        comment: commentOf(input, 'comment')
      })
    case 'delete_subtask':
      await subtaskService.deleteSubtask(prisma, requireStr(input, 'id'))
      return { deleted: true }
    default:
      throw new HttpError(400, `Unknown tool: ${name}`)
  }
}
