import type { EditorJsOutputData } from '../api/types'

interface EditorJsViewerProps {
  content: EditorJsOutputData
}

export function EditorJsViewer({ content }: EditorJsViewerProps): JSX.Element {
  return (
    <div className="editorjs-viewer">
      {content.blocks.map((block, index) => {
        const key = `${block.type}-${index}`
        const data = block.data ?? {}

        if (block.type === 'header') {
          const level = Math.min(Math.max(Number(data.level) || 2, 1), 6)
          const Tag = `h${level}` as keyof JSX.IntrinsicElements
          return <Tag key={key} dangerouslySetInnerHTML={{ __html: String(data.text ?? '') }} />
        }

        if (block.type === 'list') {
          const ListTag = data.style === 'ordered' ? 'ol' : 'ul'
          const items = Array.isArray(data.items) ? (data.items as string[]) : []
          return (
            <ListTag key={key}>
              {items.map((item, itemIndex) => (
                <li key={itemIndex} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ListTag>
          )
        }

        if (block.type === 'checklist') {
          const items = Array.isArray(data.items)
            ? (data.items as Array<{ text: string; checked: boolean }>)
            : []
          return (
            <ul key={key} style={{ listStyle: 'none', paddingLeft: 0 }}>
              {items.map((item, itemIndex) => (
                <li key={itemIndex} style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={item.checked} readOnly />
                  <span dangerouslySetInnerHTML={{ __html: item.text }} />
                </li>
              ))}
            </ul>
          )
        }

        return <p key={key} dangerouslySetInnerHTML={{ __html: String(data.text ?? '') }} />
      })}
    </div>
  )
}
