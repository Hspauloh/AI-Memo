import { NextResponse } from 'next/server'
import { ApiError, GoogleGenAI } from '@google/genai'
import {
  MAX_SUMMARY_SENTENCES,
  MIN_SUMMARY_SENTENCES,
  SUMMARY_RATIO,
  summaryLength,
} from '@/utils/summaryLength'

const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const FALLBACK_GEMINI_MODEL = 'gemini-3.5-flash-lite'
const MAX_CONTENT_LENGTH = 20000
const REQUEST_TIMEOUT_MS = 30000
const OVERLOAD_RETRY_DELAYS_MS = [1000, 2000]

const isOverloaded = (error: unknown) =>
  error instanceof ApiError && error.status === 503

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 모델 과부하(503)일 때만 짧게 대기 후 재시도
const withOverloadRetry = async <T>(task: () => Promise<T>): Promise<T> => {
  for (const delay of OVERLOAD_RETRY_DELAYS_MS) {
    try {
      return await task()
    } catch (error) {
      if (!isOverloaded(error)) throw error
      await sleep(delay)
    }
  }
  return task()
}

interface SummarizeRequestBody {
  title?: unknown
  content?: unknown
}

const buildPrompt = (title: string, content: string, stricter: boolean) => {
  const targetLength = summaryLength.getTargetLength(content)
  const stricterNote = stricter
    ? `\n- 이전 요약이 너무 길었으니 반드시 ${targetLength}자를 넘지 않게 더 짧게 요약해.`
    : ''
  return `다음 메모를 한국어로 요약해줘.
- 요약 분량은 원문 길이의 약 ${Math.round(SUMMARY_RATIO * 100)}%인 ${targetLength}자 안팎으로 해.
- 단, ${MIN_SUMMARY_SENTENCES}문장 이상 ${MAX_SUMMARY_SENTENCES}문장 이하로 해.
- 원문에 있는 내용만 사용하고, 없는 내용을 추가하거나 바꾸지 마.
- 요약 본문만 출력해.${stricterNote}

제목: ${title}

${content}`
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인해주세요.',
      },
      { status: 500 }
    )
  }

  let body: SummarizeRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  if (!content) {
    return NextResponse.json(
      { error: '요약할 메모 내용이 없습니다.' },
      { status: 400 }
    )
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: '메모 내용이 너무 길어 요약할 수 없습니다.' },
      { status: 413 }
    )
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const callModel = (model: string, stricter: boolean) =>
      withOverloadRetry(async () => {
        const response = await ai.models.generateContent({
          model,
          contents: buildPrompt(title, content, stricter),
          config: { abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
        })
        return response.text?.trim() ?? ''
      })

    // 기본 모델이 계속 과부하(503)이면 예비 모델로 한 번 더 시도
    const generate = async (stricter: boolean) => {
      try {
        return await callModel(GEMINI_MODEL, stricter)
      } catch (error) {
        if (!isOverloaded(error)) throw error
        return callModel(FALLBACK_GEMINI_MODEL, stricter)
      }
    }

    let summary = await generate(false)
    // 분량 초과 시 1회만 더 짧게 재요청, 이후에는 문장 수 상한으로 잘라냄
    if (summary && !summaryLength.isWithinLimits(summary, content)) {
      const retried = await generate(true)
      if (retried) summary = retried
    }
    if (!summary) {
      return NextResponse.json(
        { error: '요약 결과를 받지 못했습니다.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ summary: summaryLength.clampSentences(summary) })
  } catch (error) {
    console.error('메모 요약 실패:', error)

    if (error instanceof ApiError && error.status === 429) {
      return NextResponse.json(
        { error: '요청이 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }
    if (isOverloaded(error)) {
      return NextResponse.json(
        { error: 'AI 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      )
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'AI 응답이 지연되고 있습니다. 다시 시도해주세요.' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: 'AI 요약 중 오류가 발생했습니다.' },
      { status: 502 }
    )
  }
}
