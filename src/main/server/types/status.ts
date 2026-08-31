export const STATUS_VALUES = ['QUEUED', 'IN_PROGRESS', 'BLOCKED', 'PAUSED', 'POSTPONED', 'DONE'] as const

export type StatusValue = (typeof STATUS_VALUES)[number]

/** Setting a task or subtask to one of these requires an accompanying comment. */
export const STATUSES_REQUIRING_COMMENT: ReadonlySet<StatusValue> = new Set(['BLOCKED', 'PAUSED', 'POSTPONED'])
