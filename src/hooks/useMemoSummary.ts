'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Memo } from '@/types/memo'
import { summaryStorage } from '@/utils/summaryStorage'

const CLIENT_TIMEOUT_MS = 35000
const DEFAULT_ERROR = 'AI 요약에 실패했습니다.'

export const useMemoSummary = (memo: Memo | null) => {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const memoId = memo?.id
  const memoUpdatedAt = memo?.updatedAt

  // 메모 전환/닫힘 시 진행 중 요청 취소, 저장된 요약 조회 (API 호출은 하지 않음)
  useEffect(() => {
    abortRef.current?.abort()
    setLoading(false)
    setError('')
    setSummary(
      memoId && memoUpdatedAt
        ? (summaryStorage.get(memoId, memoUpdatedAt) ?? '')
        : ''
    )
    return () => abortRef.current?.abort()
  }, [memoId, memoUpdatedAt])

  const generate = useCallback(async () => {
    if (!memo) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, CLIENT_TIMEOUT_MS)

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: memo.title, content: memo.content }),
        signal: controller.signal,
      })
      const data: { summary?: string; error?: string } = await res
        .json()
        .catch(() => ({}))
      if (!res.ok || !data.summary) {
        throw new Error(data.error || DEFAULT_ERROR)
      }
      summaryStorage.set(memo.id, data.summary, memo.updatedAt)
      setSummary(data.summary)
    } catch (e) {
      if (controller.signal.aborted && !timedOut) return // 메모 전환 등으로 취소됨
      setError(
        timedOut
          ? '응답 시간이 초과되었습니다. 다시 시도해주세요.'
          : e instanceof TypeError
            ? '네트워크 연결을 확인하고 다시 시도해주세요.'
            : e instanceof Error
              ? e.message
              : DEFAULT_ERROR
      )
    } finally {
      clearTimeout(timer)
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }, [memo])

  return { summary, loading, error, generate }
}
