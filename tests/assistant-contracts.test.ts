import assert from 'node:assert/strict'
import test from 'node:test'

import { analysisResponseSchema } from '../lib/assistant-contracts.ts'

const validAnalysis = {
  verdict: 'Safe to send',
  reason: 'Clear and polite.',
  highlights: [],
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
