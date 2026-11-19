import assert from 'node:assert/strict'
import test from 'node:test'
import { enforceAnalysisInvariants } from '../lib/analysis-invariants.ts'
import type { AnalysisResponse } from '../lib/assistant-contracts.ts'

const good: AnalysisResponse = {
  verdict: 'Safe to send', reason: 'Clear, friendly scheduling.', highlights: [], languageFixes: [],
  suggestedText: 'Thanks! See you Saturday.', localizedMeaning: 'Thanks! See you Saturday.',
  inferredGoal: 'Arrange a meeting', recommendedTone: 'Friendly and conversational',
}

test('valid conversational draft may remain unchanged with no findings', () => {
  assert.deepEqual(enforceAnalysisInvariants(good, good.suggestedText), good)
})

test('grammar-only and capitalization corrections remain separate from risk', () => {
  const result = enforceAnalysisInvariants({ ...good, suggestedText: 'I can come.',
    languageFixes: [{ text: 'i', replacement: 'I', reason: 'Capitalize the pronoun.' }],
  }, 'i can come.')
  assert.equal(result.verdict, 'Safe to send')
  assert.equal(result.languageFixes.length, 1)
  assert.deepEqual(result.highlights, [])
})

test('yellow and red risk findings cannot coexist with a safe verdict', () => {
  for (const severity of ['yellow', 'red'] as const) {
    const result = enforceAnalysisInvariants({ ...good,
      highlights: [{ text: 'You are incompetent.', severity, reason: 'Personal attack.' }],
    }, 'You are incompetent.')
    assert.equal(result.verdict, 'Risky - revise')
    assert.equal(result.highlights.length, 1)
  }
})

test('findings must quote the source exactly; empty corrections are removed', () => {
  const result = enforceAnalysisInvariants({ ...good,
    highlights: [{ text: 'not in source', severity: 'yellow', reason: 'Invented.' }],
    languageFixes: [{ text: 'Thanks!', replacement: 'Thanks!', reason: 'No actual edit.' }],
  }, good.suggestedText)
  assert.deepEqual(result.highlights, [])
  assert.deepEqual(result.languageFixes, [])
})
