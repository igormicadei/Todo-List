interface DateFieldProps {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
}

export function DateField({ id, label, value, onChange }: DateFieldProps): JSX.Element {
  const inputValue = value ? value.slice(0, 10) : ''

  return (
    <div>
      <label htmlFor={id} className="cds--label" style={{ display: 'block', marginBottom: '0.25rem' }}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={inputValue}
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw ? new Date(`${raw}T00:00:00.000Z`).toISOString() : null)
        }}
        style={{
          display: 'block',
          width: '100%',
          height: '2.5rem',
          padding: '0 0.75rem',
          border: 'none',
          borderBottom: '1px solid var(--cds-border-strong, #8d8d8d)',
          background: 'var(--cds-field, #f4f4f4)',
          font: 'inherit',
          color: 'inherit'
        }}
      />
    </div>
  )
}
