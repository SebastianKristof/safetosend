import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAnalysisContextPayload, getLocalizedMeaning, getVisibleAnalysis } from '../lib/analysis-state.ts'
import type { AnalysisResponse } from '../lib/assistant-contracts.ts'

const analysis = {
  verdict: 'Safe to send',
  reason: 'Clear and direct.',
  highlights: [
    {
      text: 'Please avoid walking near the fence in the evening',
      severity: 'yellow',
      reason: 'Could sound directive without context for some audiences.',
    },
  ],
  languageFixes: [],
  suggestedText: 'Please send the report by 3 PM.',
  localizedMeaning: 'Отправьте отчет до 15:00.',
  inferredGoal: 'Request a deadline',
  recommendedTone: 'Direct and polite',
} satisfies AnalysisResponse

test('buildAnalysisContextPayload keeps the current analysis fields', () => {
  assert.deepEqual(buildAnalysisContextPayload(analysis), {
    verdict: 'Safe to send',
    reason: 'Clear and direct.',
    inferredGoal: 'Request a deadline',
    recommendedTone: 'Direct and polite',
    highlights: [
      {
        text: 'Please avoid walking near the fence in the evening',
        severity: 'yellow',
        reason: 'Could sound directive without context for some audiences.',
      },
    ],
  })
})

test('buildAnalysisContextPayload ignores missing analysis', () => {
  assert.equal(buildAnalysisContextPayload(null), undefined)
})

test('getLocalizedMeaning only shows matching non-English analysis results', () => {
  assert.equal(
    getLocalizedMeaning({
      analysis,
      analysisLocale: 'ru',
      draftIsStale: false,
      locale: 'ru',
    }),
    'Отправьте отчет до 15:00.',
  )

  assert.equal(
    getLocalizedMeaning({
      analysis,
      analysisLocale: 'en',
      draftIsStale: false,
      locale: 'ru',
    }),
    '',
  )

  assert.equal(
    getLocalizedMeaning({
      analysis,
      analysisLocale: 'ru',
      draftIsStale: true,
      locale: 'ru',
    }),
    '',
  )

  assert.equal(
    getLocalizedMeaning({
      analysis,
      analysisLocale: 'ru',
      draftIsStale: false,
      locale: 'en',
    }),
    '',
  )
})

test('old-language explanations must not appear after switching UI language', () => {
  assert.equal(getVisibleAnalysis({ analysis, analysisLocale: 'en', locale: 'fr', draftIsStale: false }), null)
  assert.equal(getVisibleAnalysis({ analysis, analysisLocale: 'ru', locale: 'en', draftIsStale: false }), null)
  assert.equal(getVisibleAnalysis({ analysis, analysisLocale: 'ru', locale: 'ru', draftIsStale: true }), null)
  assert.deepEqual(getVisibleAnalysis({ analysis, analysisLocale: 'ru', locale: 'ru', draftIsStale: false }), analysis)
})
