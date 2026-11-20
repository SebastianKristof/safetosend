import assert from 'node:assert/strict'
import test from 'node:test'

import { analysisResponseSchema, analysisModelResponseSchema, meaningResponseSchema } from '../lib/assistant-contracts.ts'

const validAnalysis = {
  verdict: 'Safe to send',
  reason: 'Clear and polite.',
  highlights: [],
  languageFixes: [],
  suggestedText: 'Please share the update when you can.',
  localizedMeaning: 'Пожалуйста, пришлите обновление, когда сможете.',
  inferredGoal: 'Request an update',
  recommendedTone: 'Polite and calm',
}

test('analysis response schema accepts localizedMeaning', () => {
  assert.equal(analysisResponseSchema.safeParse(validAnalysis).success, true)
})

test('analysis response schema rejects missing localizedMeaning', () => {
  const missingLocalizedMeaning = {
    ...validAnalysis,
  }

  delete (missingLocalizedMeaning as Partial<typeof validAnalysis>).localizedMeaning

  assert.equal(analysisResponseSchema.safeParse(missingLocalizedMeaning).success, false)
})

test('analysis-only model output must omit localizedMeaning but still return language fixes', () => {
  const { localizedMeaning: _localizedMeaning, ...withoutTranslation } = validAnalysis
  assert.equal(analysisModelResponseSchema.safeParse(withoutTranslation).success, true)
  assert.equal(analysisModelResponseSchema.safeParse(validAnalysis).success, false)
})

test('translation response accepts only a verification translation', () => {
  assert.equal(meaningResponseSchema.safeParse({ localizedMeaning: 'Ты снова забыл о сроке.' }).success, true)
  assert.equal(meaningResponseSchema.safeParse({ localizedMeaning: '', suggestedText: 'Rewrite' }).success, false)
})
