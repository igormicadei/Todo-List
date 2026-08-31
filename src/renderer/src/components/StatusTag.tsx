import { Tag } from '@carbon/react'
import type { StatusValue } from '../api/types'

type TagType = 'gray' | 'blue' | 'red' | 'magenta' | 'purple' | 'green'

const STATUS_CONFIG: Record<StatusValue, { label: string; type: TagType }> = {
  QUEUED: { label: 'Queued', type: 'gray' },
  IN_PROGRESS: { label: 'In progress', type: 'blue' },
  BLOCKED: { label: 'Blocked', type: 'red' },
  PAUSED: { label: 'Paused', type: 'magenta' },
  POSTPONED: { label: 'Postponed', type: 'purple' },
  DONE: { label: 'Done', type: 'green' }
}

interface StatusTagProps {
  status: StatusValue
  size?: 'sm' | 'md'
}

export function StatusTag({ status, size = 'sm' }: StatusTagProps): JSX.Element {
  const config = STATUS_CONFIG[status]
  return (
    <Tag type={config.type} size={size}>
      {config.label}
    </Tag>
  )
}
