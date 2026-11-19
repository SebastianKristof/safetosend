import type { Audience, Locale, StylePreferences } from './assistant-contracts.ts'

export const DEFAULT_STYLE: StylePreferences = {
  formality: 'as_written',
  preserveTone: true,
  englishVariant: 'auto',
  relationshipContext: '',
}

export function analysisInputKey(text: string, audience: Audience, locale: Locale, style: StylePreferences) {
  return JSON.stringify([text.trim(), audience, locale, style.formality,
    style.preserveTone, style.englishVariant, style.relationshipContext])
}
