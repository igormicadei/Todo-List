import { Tag } from '@carbon/react'
import { STATUS_LABELS, type StatusValue } from '../api/types'

type TagType = 'gray' | 'blue' | 'red' | 'magenta' | 'purple' | 'green'

const STATUS_TAG_TYPE: Record<StatusValue, TagType> = {
  QUEUED: 'gray',
  IN_PROGRESS: 'blue',
  BLOCKED: 'red',
  PAUSED: 'magenta',
  POSTPONED: 'purple',
  DONE: 'green'
}

interface StatusTagProps {
  status: StatusValue
  size?: 'sm' | 'md'
}

export function StatusTag({ status, size = 'sm' }: StatusTagProps): JSX.Element {
  return (
    <Tag type={STATUS_TAG_TYPE[status]} size={size}>
      {STATUS_LABELS[status]}
    </Tag>
  )
}
