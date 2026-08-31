import { Tile } from '@carbon/react'

interface PagePlaceholderProps {
  title: string
  note?: string
}

export function PagePlaceholder({ title, note }: PagePlaceholderProps): JSX.Element {
  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>{title}</h2>
      <Tile>
        <p>{note ?? 'This view is being built in the next milestone.'}</p>
      </Tile>
    </div>
  )
}
