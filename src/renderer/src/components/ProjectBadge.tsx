interface ProjectBadgeProps {
  name: string
  color: string
}

export function ProjectBadge({ name, color }: ProjectBadgeProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3125rem',
        fontSize: '0.75rem',
        lineHeight: '1.25rem',
        padding: '0 0.5rem',
        borderRadius: '999px',
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }}
      />
      {name}
    </span>
  )
}
