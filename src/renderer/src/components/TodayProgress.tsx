import { ProgressBar } from '@carbon/react'
import type { ProgressSummary } from '../api/types'

interface TodayProgressProps {
  progress: ProgressSummary
}

export function TodayProgress({ progress }: TodayProgressProps): JSX.Element {
  const helperText =
    progress.total === 0
      ? 'No tasks scheduled for today'
      : `${progress.done} of ${progress.total} tasks done today (${progress.percent}%)`

  const finished = progress.total > 0 && progress.done === progress.total

  return (
    <ProgressBar
      label="Today's progress"
      helperText={helperText}
      value={progress.total === 0 ? 0 : progress.done}
      max={progress.total === 0 ? 1 : progress.total}
      size="big"
      status={finished ? 'finished' : 'active'}
    />
  )
}
