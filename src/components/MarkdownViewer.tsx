'use client'

import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'

const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false }
)

interface MarkdownViewerProps {
  source: string
  className?: string
}

export default function MarkdownViewer({
  source,
  className,
}: MarkdownViewerProps) {
  return (
    <div data-color-mode="light" className={className}>
      <MarkdownPreview
        source={source}
        className="bg-transparent! text-sm!"
      />
    </div>
  )
}
