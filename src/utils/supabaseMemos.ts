import { Memo, MemoFormData } from '@/types/memo'
import { sampleMemos } from './seedData'
import { supabase } from './supabase'

interface MemoRow {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
}

const MEMO_COLUMNS = 'id, title, content, category, tags, created_at, updated_at'

const toMemo = (row: MemoRow): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

let sessionPromise: Promise<void> | null = null
let initialLoadPromise: Promise<Memo[]> | null = null

// 세션이 없으면 익명 로그인 (동시 호출 시 한 번만 수행)
const ensureSession = (): Promise<void> => {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return

      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw error
    })().catch(error => {
      sessionPromise = null
      throw error
    })
  }
  return sessionPromise
}

export const supabaseMemos = {
  // 전체 메모 조회 (최신순)
  getMemos: async (): Promise<Memo[]> => {
    await ensureSession()
    const { data, error } = await supabase
      .from('memos')
      .select(MEMO_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as MemoRow[]).map(toMemo)
  },

  // 메모 추가 (id는 DB에서 uuid v4로 생성)
  addMemo: async (formData: MemoFormData): Promise<Memo> => {
    await ensureSession()
    const { data, error } = await supabase
      .from('memos')
      .insert(formData)
      .select(MEMO_COLUMNS)
      .single()
    if (error) throw error
    return toMemo(data as MemoRow)
  },

  // 메모 수정
  updateMemo: async (id: string, formData: MemoFormData): Promise<Memo> => {
    await ensureSession()
    const { data, error } = await supabase
      .from('memos')
      .update({ ...formData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(MEMO_COLUMNS)
      .single()
    if (error) throw error
    return toMemo(data as MemoRow)
  },

  // 메모 삭제
  deleteMemo: async (id: string): Promise<void> => {
    await ensureSession()
    const { error } = await supabase.from('memos').delete().eq('id', id)
    if (error) throw error
  },

  // 전체 메모 삭제 (RLS로 본인 메모만 대상)
  clearMemos: async (): Promise<void> => {
    await ensureSession()
    const { error } = await supabase
      .from('memos')
      .delete()
      .not('id', 'is', null)
    if (error) throw error
  },

  // 샘플 데이터 삽입 (id는 DB에서 새로 생성)
  seedSampleMemos: async (): Promise<Memo[]> => {
    await ensureSession()
    const rows = sampleMemos.map(sample => ({
      title: sample.title,
      content: sample.content,
      category: sample.category,
      tags: sample.tags,
      created_at: sample.createdAt,
      updated_at: sample.updatedAt,
    }))
    const { data, error } = await supabase
      .from('memos')
      .insert(rows)
      .select(MEMO_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as MemoRow[]).map(toMemo)
  },

  // 초기 로드: 메모가 없으면 샘플 시딩 (StrictMode 중복 실행 시 한 번만 수행)
  loadInitialMemos: (): Promise<Memo[]> => {
    if (!initialLoadPromise) {
      initialLoadPromise = (async () => {
        const memos = await supabaseMemos.getMemos()
        return memos.length === 0 ? supabaseMemos.seedSampleMemos() : memos
      })().finally(() => {
        initialLoadPromise = null
      })
    }
    return initialLoadPromise
  },
}
