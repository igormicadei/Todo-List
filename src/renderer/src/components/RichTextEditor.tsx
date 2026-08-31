import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import EditorJS, { type OutputData, type ToolConstructable } from '@editorjs/editorjs'
import Header from '@editorjs/header'
import ListTool from '@editorjs/list'
import Checklist from '@editorjs/checklist'
import Paragraph from '@editorjs/paragraph'
import type { EditorJsOutputData } from '../api/types'

export interface RichTextEditorHandle {
  save: () => Promise<EditorJsOutputData>
  clear: () => void
}

interface RichTextEditorProps {
  placeholder?: string
  minHeight?: number
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  { placeholder = 'Write an update…', minHeight = 120 },
  ref
) {
  const editorRef = useRef<EditorJS | null>(null)
  const holderId = useRef(`editorjs-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const editor = new EditorJS({
      holder: holderId.current,
      placeholder,
      minHeight,
      autofocus: false,
      tools: {
        header: Header,
        list: ListTool,
        checklist: Checklist as unknown as ToolConstructable,
        paragraph: { class: Paragraph as unknown as ToolConstructable, inlineToolbar: true }
      }
    })
    editorRef.current = editor
    return () => {
      void editorRef.current?.destroy?.()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!editorRef.current) return { blocks: [] }
      const data = (await editorRef.current.save()) as OutputData
      return data as EditorJsOutputData
    },
    clear: () => {
      editorRef.current?.clear()
    }
  }))

  return (
    <div
      id={holderId.current}
      className="rich-text-editor"
      style={{
        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
        borderRadius: 4,
        padding: '0.5rem 0.75rem',
        minHeight
      }}
    />
  )
})
