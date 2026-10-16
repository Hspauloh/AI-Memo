'use client'

import { useEffect } from 'react'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'
import { useMemoSummary } from '@/hooks/useMemoSummary'
import MarkdownViewer from '@/components/MarkdownViewer'

interface MemoDetailModalProps {
  memo: Memo | null
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function MemoDetailModal({
  memo,
  onClose,
  onEdit,
  onDelete,
}: MemoDetailModalProps) {
  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    generate: handleSummarize,
  } = useMemoSummary(memo)

  useEffect(() => {
    if (!memo) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [memo, onClose])

  if (!memo) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="메모 상세 보기"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 break-words">
              {memo.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {MEMO_CATEGORIES[
                  memo.category as keyof typeof MEMO_CATEGORIES
                ] || memo.category}
              </span>
              <span>{formatDate(memo.updatedAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="닫기"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 overflow-y-auto flex-1">
          <div
            className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg"
            aria-busy={summaryLoading}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">AI 요약</h3>
              <button
                onClick={handleSummarize}
                disabled={summaryLoading || !memo.content.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors"
                data-testid="summarize-memo-btn"
              >
                {summaryLoading
                  ? '요약 중...'
                  : summaryError
                    ? '다시 시도'
                    : summary
                      ? '다시 요약'
                      : '요약하기'}
              </button>
            </div>
            {summary && (
              <p
                className="mt-3 text-sm text-gray-700 whitespace-pre-wrap break-words"
                data-testid="memo-summary"
              >
                {summary}
              </p>
            )}
            {summaryError && (
              <p
                className="mt-3 text-sm text-red-600"
                role="alert"
                data-testid="memo-summary-error"
              >
                {summaryError}
              </p>
            )}
          </div>

          <MarkdownViewer source={memo.content} />

          {memo.tags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">태그</h3>
              <div className="flex gap-2 flex-wrap">
                {memo.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>생성일: {formatDate(memo.createdAt)}</p>
            <p>수정일: {formatDate(memo.updatedAt)}</p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <span className="text-xs text-gray-500">
            ESC 키 또는 배경 클릭으로 닫기
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(memo)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              편집
            </button>
            <button
              onClick={() => {
                if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
                  onDelete(memo.id)
                  onClose()
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
