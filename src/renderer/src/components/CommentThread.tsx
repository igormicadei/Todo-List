import { useRef, useState } from 'react'
import { Button } from '@carbon/react'
import { RichTextEditor, type RichTextEditorHandle } from './RichTextEditor'
import { EditorJsViewer } from './EditorJsViewer'
import type { EditorJsOutputData } from '../api/types'

interface CommentLike {
  id: string
  content: EditorJsOutputData
  createdAt: string
}

interface CommentThreadProps {
  comments: CommentLike[]
  onSubmit: (content: EditorJsOutputData) => Promise<void>
}

export function CommentThread({ comments, onSubmit }: CommentThreadProps): JSX.Element {
  const editorRef = useRef<RichTextEditorHandle>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handlePost(): Promise<void> {
    const data = await editorRef.current?.save()
    if (!data || data.blocks.length === 0) return
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      editorRef.current?.clear()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        {comments.length === 0 && (
          <p style={{ color: 'var(--cds-text-secondary, #525252)', fontSize: '0.875rem' }}>No comments yet.</p>
        )}
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              border: '1px solid var(--cds-border-subtle, #e0e0e0)',
              borderRadius: 4,
              padding: '0.5rem 0.75rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary, #525252)', marginBottom: '0.25rem' }}>
              {new Date(comment.createdAt).toLocaleString()}
            </div>
            <EditorJsViewer content={comment.content} />
          </div>
        ))}
      </div>
      <RichTextEditor ref={editorRef} placeholder="Add a comment or update…" minHeight={100} />
      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm" onClick={() => void handlePost()} disabled={isSubmitting}>
          Post
        </Button>
      </div>
    </div>
  )
}
