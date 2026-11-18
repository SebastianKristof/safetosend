import type { AnalysisResponse } from './assistant-contracts.ts'

export function enforceAnalysisInvariants(result: AnalysisResponse, sourceDraft: string): AnalysisResponse {
  // Keep comparison case-sensitive: capitalization can be a real correction.
  const highlights = result.highlights.filter(item => sourceDraft.includes(item.text))
  const languageFixes = result.languageFixes.filter(item =>
    sourceDraft.includes(item.text) && item.text !== item.replacement)
  const verdict = highlights.length && result.verdict === 'Safe to send'
    ? 'Risky - revise' : result.verdict
  return { ...result, verdict, highlights, languageFixes }
}
