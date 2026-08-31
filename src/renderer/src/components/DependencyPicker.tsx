import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, ComboBox } from '@carbon/react'
import { Close } from '@carbon/icons-react'
import * as api from '../api/client'
import type { Task } from '../api/types'
import { StatusTag } from './StatusTag'

interface DependencyPickerProps {
  taskId: string
}

export function DependencyPicker({ taskId }: DependencyPickerProps): JSX.Element {
  const queryClient = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const depsQuery = useQuery({
    queryKey: ['dependencies', taskId],
    queryFn: () => api.listDependencies(taskId)
  })
  const allTasksQuery = useQuery({ queryKey: ['tasks-all'], queryFn: () => api.listTasks() })

  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: ['dependencies', taskId] })
    void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
  }

  const addMutation = useMutation({
    mutationFn: (dependsOnId: string) => api.addDependency(taskId, dependsOnId),
    onSuccess: () => {
      setErrorMessage(null)
      invalidate()
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Could not add dependency')
    }
  })

  const removeMutation = useMutation({
    mutationFn: (dependsOnId: string) => api.removeDependency(taskId, dependsOnId),
    onSuccess: invalidate
  })

  const dependsOn = depsQuery.data?.dependsOn ?? []
  const existingIds = new Set([taskId, ...dependsOn.map((dep) => dep.id)])
  const candidates: Task[] = (allTasksQuery.data ?? []).filter((task) => !existingIds.has(task.id))

  return (
    <div>
      <h5 style={{ marginBottom: '0.5rem' }}>Dependencies</h5>
      {dependsOn.length === 0 && (
        <p style={{ color: 'var(--cds-text-secondary, #525252)', fontSize: '0.875rem' }}>No dependencies.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
        {dependsOn.map((dep) => (
          <div
            key={dep.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              border: '1px solid var(--cds-border-subtle, #e0e0e0)',
              borderRadius: 4,
              padding: '0.375rem 0.625rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem' }}>{dep.title}</span>
              <StatusTag status={dep.status} />
            </div>
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription="Remove dependency"
              renderIcon={Close}
              onClick={() => removeMutation.mutate(dep.id)}
            />
          </div>
        ))}
      </div>
      <ComboBox
        id={`add-dependency-${taskId}`}
        titleText="Add dependency"
        placeholder="Search tasks…"
        items={candidates}
        itemToString={(item) => (item ? `${item.project.name}: ${item.title}` : '')}
        selectedItem={null}
        onChange={({ selectedItem }) => {
          if (selectedItem) addMutation.mutate(selectedItem.id)
        }}
      />
      {errorMessage && (
        <p style={{ color: 'var(--cds-support-error, #da1e28)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
