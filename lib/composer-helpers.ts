import type { AnalysisResponse, Audience, EditChange, Locale, StylePreferences, Verdict } from './assistant-contracts'
import type { DraftSnapshot } from './assistant-client'
import type { Copy } from './ui-copy'
import { audioFileExtension } from './audio-format'
const STORAGE_KEY = 'safetosend.app.state.v4'

export type PersistedState = {
  workingText: string
  audience: string
  voiceCommand: string
  locale?: Locale
  analysisLocale?: Locale | null
  version?: number
  analysis: AnalysisResponse | null
  analysisKey?: string
  style?: StylePreferences
  past: DraftSnapshot[]
  future: DraftSnapshot[]
  lastChangeNote: string
  lastChanges?: EditChange[]
  clientId: string
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function buildClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `client-${Math.random().toString(36).slice(2, 10)}`
}

function verdictStyle(verdict: Verdict) {
  if (verdict === 'Safe to send') {
    return 'verdict-ok'
  }

  if (verdict === 'Risky - revise') {
    return 'verdict-warning'
  }

  return 'verdict-danger'
}

function localizedVerdict(verdict: Verdict, copy: Copy) {
  if (verdict === 'Safe to send') {
    return copy.verdicts.ok
  }

  if (verdict === 'Risky - revise') {
    return copy.verdicts.risky
  }

  return copy.verdicts.hold
}

function buildAudienceOptions(copy: Copy): Array<{ value: Audience; label: string; helper: string }> {
  return [
    { value: 'boss', label: copy.audiences.boss.label, helper: copy.audiences.boss.helper },
    { value: 'client', label: copy.audiences.client.label, helper: copy.audiences.client.helper },
    { value: 'colleague', label: copy.audiences.colleague.label, helper: copy.audiences.colleague.helper },
    { value: 'partner', label: copy.audiences.partner.label, helper: copy.audiences.partner.helper },
    { value: 'general', label: copy.audiences.general.label, helper: copy.audiences.general.helper },
  ]
}

const AUDIENCE_VALUES = new Set<Audience>(['boss', 'client', 'colleague', 'partner', 'general'])

function normalizeAudience(value: string | null | undefined): Audience {
  return value && AUDIENCE_VALUES.has(value as Audience) ? (value as Audience) : 'general'
}

function defaultRewriteInstruction(_locale: Locale) {
  return 'Resolve genuine communication risks and language errors using the active style settings. Preserve the intended register and voice. If no useful edit is needed, return the original unchanged.'
}

const MAX_RECORDING_SECONDS = 45
const MIN_TRANSCRIPTION_BYTES = 1200

function mergeTranscribedText(existing: string, transcript: string) {
  const normalizedTranscript = transcript.trim()

  if (!normalizedTranscript) {
    return existing
  }

  if (!existing.trim()) {
    return normalizedTranscript
  }

  const separator = existing.endsWith('\n') ? '' : '\n'
  return `${existing}${separator}${normalizedTranscript}`
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData()
  const ext = audioFileExtension(blob.type)
  form.append('audio', new File([blob], `voice-input.${ext}`, { type: blob.type }))

  const endpoint = new URL('/api/transcribe', window.location.origin).toString()
  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
  })

  const data = (await response.json().catch(() => ({}))) as {
    text?: string
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error || `Transcription failed (HTTP ${response.status}).`)
  }

  const transcript = data.text?.trim() || ''
  if (!transcript) {
    throw new Error('No transcript returned.')
  }

  return transcript
}


export { loadPersistedState, buildClientId, verdictStyle, localizedVerdict, buildAudienceOptions, normalizeAudience, defaultRewriteInstruction, mergeTranscribedText, transcribeBlob, MAX_RECORDING_SECONDS, MIN_TRANSCRIPTION_BYTES, STORAGE_KEY }

export async function postAssistant<T>(body: Record<string, unknown>, fallbackError: string) {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as T | { error?: string; detail?: string } | null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : fallbackError
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload && payload.detail
        ? ` ${payload.detail}`
        : ''

      throw new Error(`${message}${detail}`)
  }

  return payload as T
}

