import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, InlineLoading, InlineNotification, Tag, Toggle } from '@carbon/react'
import { Add, Edit, TrashCan } from '@carbon/icons-react'
import * as api from '../api/client'
import type { Project } from '../api/types'
import { ProjectFormModal, type ProjectFormInput } from '../components/ProjectFormModal'

export function ProjectsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const [includeArchived, setIncludeArchived] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects-page', includeArchived],
    queryFn: () => api.listProjects(includeArchived)
  })

  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: ['projects-page'] })
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['tasks-all'] })
  }

  const createMutation = useMutation({
    mutationFn: (input: ProjectFormInput) => api.createProject(input),
    onSuccess: invalidate
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectFormInput }) => api.updateProject(id, input),
    onSuccess: invalidate
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => api.updateProject(id, { archived }),
    onSuccess: invalidate
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: invalidate
  })

  function openCreate(): void {
    setEditingProject(null)
    setModalOpen(true)
  }

  function openEdit(project: Project): void {
    setEditingProject(project)
    setModalOpen(true)
  }

  async function handleSubmit(input: ProjectFormInput): Promise<void> {
    if (editingProject) {
      await updateMutation.mutateAsync({ id: editingProject.id, input })
    } else {
      await createMutation.mutateAsync(input)
    }
  }

  const projects = projectsQuery.data ?? []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Projects</h2>
        <Button renderIcon={Add} onClick={openCreate}>
          New project
        </Button>
      </div>

      <Toggle
        id="include-archived"
        labelText=""
        hideLabel
        labelA="Hide archived"
        labelB="Show archived"
        toggled={includeArchived}
        onToggle={setIncludeArchived}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {projectsQuery.isLoading && <InlineLoading description="Loading projects…" />}
        {projectsQuery.error && (
          <InlineNotification
            kind="error"
            title="Couldn't load projects"
            hideCloseButton
            subtitle={projectsQuery.error instanceof Error ? projectsQuery.error.message : 'Unknown error'}
          />
        )}
        {projects.length === 0 && !projectsQuery.isLoading && <p>No projects yet. Create one to get started.</p>}
        {projects.map((project) => (
          <div
            key={project.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--cds-border-subtle, #e0e0e0)',
              borderRadius: 4,
              padding: '0.75rem 1rem',
              opacity: project.archived ? 0.6 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{ width: 14, height: 14, borderRadius: '50%', background: project.color, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {project.name}
                  {project.archived && (
                    <Tag type="gray" size="sm">
                      Archived
                    </Tag>
                  )}
                </div>
                {project.description && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)' }}>
                    {project.description}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <Button kind="ghost" size="sm" hasIconOnly iconDescription="Edit" renderIcon={Edit} onClick={() => openEdit(project)} />
              <Button
                kind="ghost"
                size="sm"
                onClick={() => archiveMutation.mutate({ id: project.id, archived: !project.archived })}
              >
                {project.archived ? 'Unarchive' : 'Archive'}
              </Button>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                iconDescription="Delete"
                renderIcon={TrashCan}
                onClick={() => {
                  if (window.confirm(`Delete "${project.name}" and all of its tasks? This cannot be undone.`)) {
                    deleteMutation.mutate(project.id)
                  }
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <ProjectFormModal
        open={modalOpen}
        project={editingProject}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
