import assert from 'node:assert/strict'
import test from 'node:test'
import { assistantRequestSchema, editResponseSchema } from '../lib/assistant-contracts.ts'
import { DEFAULT_STYLE, analysisInputKey } from '../lib/style-preferences.ts'
import { buildAnalysisPrompt, buildEditPrompt, getPromptBundle } from '../lib/assistant-prompts.ts'

test('old clients receive voice-preserving defaults; invalid preferences fail validation', () => {
  const request = assistantRequestSchema.parse({ mode: 'analyze', text: 'Thanks!', audience: 'client' })
  assert.deepEqual(request.style, DEFAULT_STYLE)
  assert.equal(assistantRequestSchema.safeParse({ ...request, style: { formality: 'stuffy' } }).success, false)
  assert.equal(assistantRequestSchema.safeParse({ ...request, style: { relationshipContext: 'a'.repeat(501) } }).success, false)
})

test('freshness includes every style setting, audience, locale, and meaningful text change', () => {
  const original = analysisInputKey('Thanks!', 'general', 'en', DEFAULT_STYLE)
  for (const style of [
    { ...DEFAULT_STYLE, formality: 'formal' as const },
    { ...DEFAULT_STYLE, preserveTone: false },
    { ...DEFAULT_STYLE, englishVariant: 'american' as const },
    { ...DEFAULT_STYLE, relationshipContext: 'Old friend' },
  ]) assert.notEqual(analysisInputKey('Thanks!', 'general', 'en', style), original)
  assert.notEqual(analysisInputKey('Thanks!', 'client', 'en', DEFAULT_STYLE), original)
  assert.notEqual(analysisInputKey('Thanks!', 'general', 'ru', DEFAULT_STYLE), original)
  assert.notEqual(analysisInputKey('thanks!', 'general', 'en', DEFAULT_STYLE), original)
  assert.equal(analysisInputKey('  Thanks! ', 'general', 'en', DEFAULT_STYLE), original)
})

test('analysis and editing both receive independent style and interface-language context', async () => {
  const bundle = await getPromptBundle()
  const request = assistantRequestSchema.parse({
    mode: 'analyze', text: "I'm packed until Friday but should be in Brooklyn on Saturday!",
    audience: 'client', locale: 'ru', instruction: 'Correct grammar only',
    style: { formality: 'casual', preserveTone: true, englishVariant: 'american', relationshipContext: 'Recruiter I already know' },
  })
  for (const prompt of [
    buildAnalysisPrompt(request, bundle.analyzeUser, bundle.audienceGuidance.client),
    buildEditPrompt(request, bundle.editUser, bundle.audienceGuidance.client),
  ]) {
    assert.match(prompt, /Formality target: casual/)
    assert.match(prompt, /Keep my tone: true/)
    assert.match(prompt, /English variant: american/)
    assert.match(prompt, /Recruiter I already know/)
    assert.match(prompt, /Russian/)
    assert.doesNotMatch(prompt, /\{\{\w+\}\}/)
  }
})

test('an edit can explicitly leave a correct message unchanged', () => {
  assert.equal(editResponseSchema.safeParse({
    editType: 'local_instruction', appliedToWholeDraft: false,
    updatedText: 'Thanks! See you Saturday.', changes: [],
  }).success, true)
})
