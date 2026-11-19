import type { AnalysisResponse, EditChange, Locale, Verdict } from './assistant-contracts'

export type DraftSnapshot = {
  version: number
  draft: string
  analysis: AnalysisResponse | null
  analysisLocale?: Locale | null
  analysisKey?: string
  voiceCommand?: string
  note: string
  changes: EditChange[]
}

export function verdictClass(verdict: Verdict) {
  if (verdict === 'Safe to send') {
    return 'ok'
  }

  if (verdict === 'Risky - revise') {
    return 'warning'
  }

  return 'danger'
}
