import type { AnalysisResponse, Locale } from './assistant-contracts'

export type AnalysisContextPayload = {
  verdict?: AnalysisResponse['verdict']
  reason?: string
  inferredGoal?: string
  recommendedTone?: string
}

export function buildAnalysisContextPayload(analysis: AnalysisResponse | null): AnalysisContextPayload | undefined {
  if (!analysis) {
    return undefined
  }

  const verdict = analysis.verdict
  const verdictIsCurrent =
    verdict === 'Safe to send' || verdict === 'Risky - revise' || verdict === 'Do not send yet'

  return {
    verdict: verdictIsCurrent ? verdict : undefined,
    reason: analysis.reason,
    inferredGoal: analysis.inferredGoal,
    recommendedTone: analysis.recommendedTone,
  }
}

export function getLocalizedMeaning(params: {
  analysis: Pick<AnalysisResponse, 'localizedMeaning'> | null
  analysisLocale: Locale | null | undefined
  draftIsStale: boolean
  locale: Locale
}) {
  const { analysis, analysisLocale, draftIsStale, locale } = params

  if (locale === 'en' || draftIsStale || analysisLocale !== locale) {
    return ''
  }

  return analysis?.localizedMeaning?.trim() ?? ''
}
