import type { AnalysisResponse, Verdict } from './assistant-contracts'

export type DraftSnapshot = {
  draft: string
  analysis: AnalysisResponse | null
  note: string
}

export function verdictClass(verdict: Verdict) {
  if (verdict === 'OK to send') {
    return 'ok'
  }

  if (verdict === 'Risky - revise') {
    return 'warning'
  }

  return 'danger'
}
