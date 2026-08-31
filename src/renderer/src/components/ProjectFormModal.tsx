import { useEffect, useState } from 'react'
import { Modal, TextArea, TextInput } from '@carbon/react'
import type { Project } from '../api/types'

const PRESET_COLORS = ['#0f62fe', '#8a3ffc', '#24a148', '#da1e28', '#ff832b', '#08bdba', '#d02670', '#4589ff']

export interface ProjectFormInput {
  name: string
  color: string
  description?: string
}

interface ProjectFormModalProps {
  open: boolean
  project: Project | null
  onClose: () => void
  onSubmit: (input: ProjectFormInput) => Promise<void>
}

export function ProjectFormModal({ open, project, onClose, onSubmit }: ProjectFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '')
      setColor(project?.color ?? PRESET_COLORS[0])
      setDescription(project?.description ?? '')
    }
  }, [open, project])

  async function handleSubmit(): Promise<void> {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setIsSubmitting(true)
    try {
      await onSubmit({ name: trimmedName, color, description: description.trim() || undefined })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      modalHeading={project ? 'Edit project' : 'New project'}
      primaryButtonText={project ? 'Save' : 'Create'}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => void handleSubmit()}
      primaryButtonDisabled={!name.trim() || isSubmitting}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <TextInput
          id="project-name"
          labelText="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div>
          <label className="cds--label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Color
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                aria-label={`Use color ${preset}`}
                aria-pressed={color === preset}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: preset,
                  border:
                    color === preset ? '2px solid var(--cds-text-primary, #161616)' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>
        <TextArea
          id="project-description"
          labelText="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
    </Modal>
  )
}
