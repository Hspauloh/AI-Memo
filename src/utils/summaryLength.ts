export const SUMMARY_RATIO = 0.3
export const MIN_SUMMARY_SENTENCES = 1
export const MAX_SUMMARY_SENTENCES = 20

// 목표 글자 수 대비 허용 배율
const LENGTH_TOLERANCE = 1.5

const SENTENCE_PATTERN = /[^.!?。\n]+[.!?。]*/g

const splitSentences = (text: string): string[] =>
  (text.match(SENTENCE_PATTERN) ?? []).map(s => s.trim()).filter(Boolean)

export const summaryLength = {
  // 원문 길이에 비례한 목표 글자 수
  getTargetLength: (content: string): number =>
    Math.max(1, Math.round(content.length * SUMMARY_RATIO)),

  countSentences: (text: string): number => splitSentences(text).length,

  // 문장 수 1~20 이내이고, 2문장 이상이면 글자 수가 목표의 1.5배 이내인지
  isWithinLimits: (summary: string, content: string): boolean => {
    const sentences = splitSentences(summary).length
    if (
      sentences < MIN_SUMMARY_SENTENCES ||
      sentences > MAX_SUMMARY_SENTENCES
    ) {
      return false
    }
    if (sentences === MIN_SUMMARY_SENTENCES) return true
    return (
      summary.length <=
      summaryLength.getTargetLength(content) * LENGTH_TOLERANCE
    )
  },

  // 최대 문장 수 초과 시 앞에서부터 잘라냄
  clampSentences: (summary: string): string => {
    const sentences = splitSentences(summary)
    if (sentences.length <= MAX_SUMMARY_SENTENCES) return summary.trim()
    return sentences.slice(0, MAX_SUMMARY_SENTENCES).join(' ')
  },
}
