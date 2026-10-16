import { MemoSummaryCache } from '@/types/memo'

const STORAGE_KEY = 'memo-app-summaries'

const readCache = (): MemoSummaryCache => {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error loading summaries from localStorage:', error)
    return {}
  }
}

const writeCache = (cache: MemoSummaryCache): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error saving summaries to localStorage:', error)
  }
}

export const summaryStorage = {
  // 저장된 요약 조회 (메모가 수정되었으면 null)
  get: (id: string, memoUpdatedAt: string): string | null => {
    const entry = readCache()[id]
    if (!entry || entry.memoUpdatedAt !== memoUpdatedAt) return null
    return entry.summary
  },

  // 요약 저장
  set: (id: string, summary: string, memoUpdatedAt: string): void => {
    const cache = readCache()
    cache[id] = { summary, memoUpdatedAt }
    writeCache(cache)
  },

  // 특정 메모의 요약 삭제
  remove: (id: string): void => {
    const cache = readCache()
    if (!(id in cache)) return
    delete cache[id]
    writeCache(cache)
  },

  // 전체 요약 삭제
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  },
}
