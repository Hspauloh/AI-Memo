'use client'

import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'

// MDEditor는 브라우저 API에 의존하므로 SSR 비활성화
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-lg bg-gray-100" />
  ),
})

interface MarkdownEditorProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
}

export default function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder = '마크다운으로 메모 내용을 입력하세요',
  height = 320,
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="light" data-testid="markdown-editor">
      <MDEditor
        value={value}
        onChange={val => onChange(val ?? '')}
        // 편집 + 실시간 프리뷰를 동시에 표시
        preview="live"
        height={height}
        textareaProps={{ id, placeholder }}
      />
    </div>
  )
}
