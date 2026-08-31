export interface EditorJsBlock {
  type: string
  data: Record<string, unknown>
}

export interface EditorJsOutputData {
  time?: number
  version?: string
  blocks: EditorJsBlock[]
}

export function serializeEditorJsContent(content: EditorJsOutputData): string {
  return JSON.stringify(content)
}

export function deserializeEditorJsContent(raw: string): EditorJsOutputData {
  return JSON.parse(raw) as EditorJsOutputData
}

export function textToEditorJsContent(text: string): EditorJsOutputData {
  return {
    time: Date.now(),
    version: '2.28.0',
    blocks: [{ type: 'paragraph', data: { text } }]
  }
}

/** Flattens a document's blocks to plain text, used to check a comment isn't empty. */
export function editorJsContentToPlainText(content: EditorJsOutputData): string {
  return content.blocks
    .map((block) => {
      const data = block.data ?? {}
      if (typeof data.text === 'string') return data.text
      if (Array.isArray(data.items)) return data.items.map(String).join(' ')
      return ''
    })
    .join('\n')
    .trim()
}
