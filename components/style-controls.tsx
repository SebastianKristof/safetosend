'use client'

import type { Locale, StylePreferences } from '@/lib/assistant-contracts'
import { getStyleCopy } from '@/lib/style-copy'

export function StyleControls({ value, onChange, locale }: {
  value: StylePreferences
  onChange: (value: StylePreferences) => void
  locale: Locale
}) {
  const copy = getStyleCopy(locale)
  return <div className="style-controls">
    <label className="field">
      <span>{copy.formality}</span>
      <select className="control" value={value.formality} onChange={event =>
        onChange({ ...value, formality: event.target.value as StylePreferences['formality'] })}>
        {(['as_written', 'casual', 'professional_conversational', 'formal'] as const).map(option =>
          <option key={option} value={option}>{copy[option]}</option>)}
      </select>
    </label>
    <label className="tone-toggle">
      <input type="checkbox" checked={value.preserveTone} onChange={event =>
        onChange({ ...value, preserveTone: event.target.checked })} />
      <span><strong>{copy.keepTone}</strong><small>{copy.toneHint}</small></span>
    </label>
    <details className="style-context">
      <summary>{copy.more}</summary>
      <label className="field">
        <span>{copy.context}</span>
        <textarea className="control compact-textarea" rows={2} maxLength={500}
          value={value.relationshipContext} placeholder={copy.contextPlaceholder}
          onChange={event => onChange({ ...value, relationshipContext: event.target.value })} />
      </label>
      <label className="field">
        <span>{copy.variant}</span>
        <select className="control" value={value.englishVariant} onChange={event =>
          onChange({ ...value, englishVariant: event.target.value as StylePreferences['englishVariant'] })}>
          {(['auto', 'american', 'british'] as const).map(option =>
            <option key={option} value={option}>{copy[option]}</option>)}
        </select>
      </label>
    </details>
  </div>
}
