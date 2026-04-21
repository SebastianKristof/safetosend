'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnalysisResponse, Audience, TransformResponse, Verdict } from '@/lib/assistant-contracts'
import type { DraftSnapshot } from '@/lib/assistant-client'

const STORAGE_KEY = 'safetosend.app.state.v2'

const audienceOptions: Array<{ value: Audience; label: string; helper: string }> = [
  { value: 'boss', label: 'Boss', helper: 'Short, clear, low-friction' },
  { value: 'client', label: 'Client', helper: 'Polished, careful, confident' },
  { value: 'colleague', label: 'Colleague', helper: 'Direct and collaborative' },
  { value: 'partner', label: 'Partner', helper: 'Warm and non-defensive' },
  { value: 'other', label: 'Other', helper: 'Neutral and adaptive' },
]

type PersistedState = {
  workingText: string
  audience: Audience
  goal: string
  voiceCommand: string
  analysis: AnalysisResponse | null
  past: DraftSnapshot[]
  future: DraftSnapshot[]
  lastChangeNote: string
  clientId: string
}

type SpeechRecognitionController = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
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
  if (verdict === 'OK to send') {
    return 'verdict-ok'
  }

  if (verdict === 'Risky - revise') {
    return 'verdict-warning'
  }

  return 'verdict-danger'
}

async function postAssistant<T>(body: Record<string, unknown>) {
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
        : 'Request failed.'
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload && payload.detail
        ? ` ${payload.detail}`
        : ''

    throw new Error(`${message}${detail}`)
  }

  return payload as T
}

export default function Page() {
  const [workingText, setWorkingText] = useState('')
  const [audience, setAudience] = useState<Audience>('other')
  const [goal, setGoal] = useState('')
  const [voiceCommand, setVoiceCommand] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [past, setPast] = useState<DraftSnapshot[]>([])
  const [future, setFuture] = useState<DraftSnapshot[]>([])
  const [lastChangeNote, setLastChangeNote] = useState('Paste, dictate, or write a draft.')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'rewriting' | 'listening'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [clientId, setClientId] = useState('anonymous')
  const [speechSupported, setSpeechSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionController | null>(null)
  const hydratedRef = useRef(false)
  const lastAnalyzedDraftRef = useRef('')

  useEffect(() => {
    const persisted = loadPersistedState()

    if (persisted) {
      setWorkingText(persisted.workingText)
      setAudience(persisted.audience)
      setGoal(persisted.goal)
      setVoiceCommand(persisted.voiceCommand || '')
      setAnalysis(persisted.analysis)
      setPast(persisted.past)
      setFuture(persisted.future)
      setLastChangeNote(persisted.lastChangeNote)
      setClientId(persisted.clientId || buildClientId())
      lastAnalyzedDraftRef.current = persisted.workingText
    } else {
      setClientId(buildClientId())
    }

    const win = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionController
      webkitSpeechRecognition?: new () => SpeechRecognitionController
    }

    setSpeechSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition))
    hydratedRef.current = true

    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    const state: PersistedState = {
      workingText,
      audience,
      goal,
      voiceCommand,
      analysis,
      past,
      future,
      lastChangeNote,
      clientId,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [analysis, audience, clientId, future, goal, lastChangeNote, past, voiceCommand, workingText])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])

  const verdictTone = useMemo(() => {
    if (!analysis) {
      return 'neutral'
    }

    return verdictStyle(analysis.verdict)
  }, [analysis])

  const draftIsStale = Boolean(analysis) && workingText.trim() !== lastAnalyzedDraftRef.current.trim()
  const statusText =
    status === 'listening'
      ? 'Listening'
      : status === 'analyzing'
        ? 'Checking'
        : status === 'rewriting'
          ? 'Rewriting'
          : draftIsStale
            ? 'Draft changed'
            : lastChangeNote

  function currentSnapshot(note = lastChangeNote): DraftSnapshot {
    return {
      draft: workingText,
      analysis,
      note,
    }
  }

  function checkpoint(note: string) {
    setPast((existing) => [...existing, currentSnapshot(note)].slice(-20))
    setFuture([])
  }

  async function analyzeCurrentDraft(textToAnalyze: string, options?: { commitDraft?: boolean }) {
    const commitDraft = options?.commitDraft ?? false
    setStatus('analyzing')
    setError(null)

    try {
      const result = await postAssistant<AnalysisResponse>({
        mode: 'analyze',
        text: textToAnalyze,
        audience,
        goal,
        clientId,
        analysisContext: analysis
          ? {
              verdict: analysis.verdict,
              reasons: analysis.reasons,
              inferredGoal: analysis.inferredGoal,
            }
          : undefined,
      })

      setAnalysis(result)

      if (commitDraft) {
        setWorkingText(result.suggestedText)
        lastAnalyzedDraftRef.current = result.suggestedText
      } else {
        lastAnalyzedDraftRef.current = textToAnalyze
      }

      setLastChangeNote(`Assistant updated: ${result.verdict}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setStatus('idle')
    }
  }

  async function runCheck() {
    const source = workingText.trim()

    if (source.length < 3) {
      setError('Paste a draft first.')
      return
    }

    checkpoint('Before check')
    await analyzeCurrentDraft(source)
  }

  async function runRewrite() {
    const source = workingText.trim()
    const instruction = voiceCommand.trim() || 'Rewrite this to be clearer, calmer, and ready to send.'

    if (source.length < 3) {
      setError('Add a draft first.')
      return
    }

    checkpoint('Before rewrite')
    setStatus('rewriting')
    setError(null)

    try {
      const result = await postAssistant<TransformResponse>({
        mode: 'edit',
        text: source,
        audience,
        goal,
        instruction,
        clientId,
        analysisContext: analysis
          ? {
              verdict: analysis.verdict,
              reasons: analysis.reasons,
              inferredGoal: analysis.inferredGoal,
            }
          : undefined,
      })

      setWorkingText(result.updatedText)
      setLastChangeNote(result.note)
      setVoiceCommand('')
      lastAnalyzedDraftRef.current = result.updatedText
      await analyzeCurrentDraft(result.updatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rewrite failed.')
      setStatus('idle')
    }
  }

  function undoLastChange() {
    const previous = past.at(-1)

    if (!previous) {
      return
    }

    setPast((existing) => existing.slice(0, -1))
    setFuture((existing) => [...existing, currentSnapshot()].slice(-20))
    setWorkingText(previous.draft)
    setAnalysis(previous.analysis)
    setLastChangeNote(previous.note)
    lastAnalyzedDraftRef.current = previous.draft
  }

  function redoLastChange() {
    const next = future.at(-1)

    if (!next) {
      return
    }

    setFuture((existing) => existing.slice(0, -1))
    setPast((existing) => [...existing, currentSnapshot()].slice(-20))
    setWorkingText(next.draft)
    setAnalysis(next.analysis)
    setLastChangeNote(next.note)
    lastAnalyzedDraftRef.current = next.draft
  }

  async function copyWorkingText() {
    const text = workingText.trim()

    if (!text) {
      setError('Nothing to copy.')
      return
    }

    try {
      await navigator.clipboard.writeText(workingText)
      setCopied(true)
      setLastChangeNote('Draft copied')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy failed.')
    }
  }

  async function pasteIntoDraft() {
    if (status !== 'idle') {
      return
    }

    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        setError('Clipboard is empty.')
        return
      }

      checkpoint('Before paste')
      setWorkingText(text)
      setLastChangeNote('Clipboard pasted')
      lastAnalyzedDraftRef.current = text
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paste failed.')
    }
  }

  function getSpeechRecognition() {
    const win = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionController
      webkitSpeechRecognition?: new () => SpeechRecognitionController
    }

    return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
  }

  function appendTranscript(transcript: string) {
    const cleaned = transcript.trim()
    if (!cleaned) {
      return
    }

    setVoiceCommand((previous) => {
      const prefix = previous.trim()
      return prefix ? `${prefix} ${cleaned}` : cleaned
    })
  }

  async function toggleVoiceCommandMic() {
    if (status === 'listening') {
      recognitionRef.current?.stop()
      return
    }

    if (!speechSupported) {
      setError('Speech recognition is not available in this browser.')
      return
    }

    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      setError('Speech recognition is not available in this browser.')
      return
    }

    if (!recognitionRef.current) {
      const recognition = new Recognition()
      recognition.lang = 'en-US'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results ?? [])
          .map((result: any) => result?.[0]?.transcript || '')
          .join(' ')
        appendTranscript(transcript)
        setLastChangeNote('Voice command captured')
      }
      recognition.onerror = (event: any) => {
        setError(`Dictation failed${event?.error ? `: ${event.error}` : '.'}`)
        setStatus('idle')
      }
      recognition.onend = () => {
        setStatus((current) => (current === 'listening' ? 'idle' : current))
      }
      recognitionRef.current = recognition
    }

    setError(null)
    setStatus('listening')

    try {
      recognitionRef.current.start()
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Could not start voice capture.')
    }
  }

  const verdictLabel = analysis ? analysis.verdict : 'Waiting'
  const riskLabel = analysis ? analysis.riskLevel : 'idle'

  return (
    <main className="page-shell">
      <header className="hero-bar">
        <div className="hero-copy">
          <p className="eyebrow">SafeToSend</p>
          <h1>Is it safe to send?</h1>
          <p className="subtle">
            Your second pair of eyes before sending.
          </p>
        </div>
        <div className="status-pill" aria-live="polite">
          <span className={`status-dot ${status === 'idle' ? 'idle' : 'busy'}`} />
          <span>{statusText}</span>
        </div>
      </header>

      <section className="panel composer-card">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Composer</p>
            <h2>The message lives here.</h2>
          </div>
          <div className={`analysis-badge ${draftIsStale ? 'stale' : 'fresh'}`}>
            {analysis ? verdictLabel : 'Ready'}
          </div>
        </div>

        <section className="analysis-card" aria-live="polite">
          <div className="analysis-topline">
            <span className={`verdict-pill ${verdictTone}`}>{verdictLabel}</span>
            <span className={`risk-chip ${riskLabel}`}>{riskLabel}</span>
          </div>
          <p className="analysis-meta">
            {analysis
              ? `Likely intent: ${analysis.inferredGoal} · Confidence ${Math.round(analysis.confidence * 100)}%`
              : 'Results appear here after you check or rewrite the message.'}
          </p>
          {analysis ? (
            <div className="analysis-reasons">
              <p className="analysis-reasons-label">Reasons</p>
              <ul className="reason-list">
                {analysis.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="editor-shell">
          <label className="field editor-field">
            <span>Working text</span>
            <textarea
              className="text-input draft-input"
              value={workingText}
              onChange={(event) => {
                setWorkingText(event.target.value)
                setError(null)
              }}
              placeholder="Paste, type, or rewrite the message here."
              />
          </label>

          <div className="history-rail" aria-label="Draft controls">
            <button
              className="ghost-button rail-button"
              onClick={undoLastChange}
              disabled={!past.length || status !== 'idle'}
              type="button"
            >
              Undo
            </button>
            <button
              className="ghost-button rail-button"
              onClick={redoLastChange}
              disabled={!future.length || status !== 'idle'}
              type="button"
            >
              Redo
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void copyWorkingText()}
              disabled={status !== 'idle' || !workingText.trim()}
              type="button"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void pasteIntoDraft()}
              disabled={status !== 'idle'}
              type="button"
            >
              Paste
            </button>
          </div>
        </div>

        <div className="control-grid">
          <label className="field">
            <span>Audience</span>
            <select
              className="control"
              value={audience}
              onChange={(event) => setAudience(event.target.value as Audience)}
            >
              {audienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.helper}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Goal</span>
            <input
              className="control"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Ask for clarification"
            />
          </label>
        </div>

        <div className="button-grid">
          <button
            className="primary-button"
            onClick={() => void runCheck()}
            disabled={status !== 'idle' || workingText.trim().length < 3}
            type="button"
          >
            {status === 'analyzing' ? 'Checking...' : 'Check'}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runRewrite()}
            disabled={status !== 'idle' || !workingText.trim()}
            type="button"
          >
            {status === 'rewriting' ? 'Rewriting...' : 'Rewrite'}
          </button>
        </div>

        <div className="voice-row">
          <label className="field grow">
            <span>Voice commands</span>
            <input
              className="control"
              value={voiceCommand}
              onChange={(event) => setVoiceCommand(event.target.value)}
              placeholder="make it shorter and less blunt"
            />
          </label>

          <button
            className="secondary-button edit-button"
            onClick={() => void runRewrite()}
            disabled={status !== 'idle' || !workingText.trim()}
            type="button"
          >
            {status === 'rewriting' ? 'Editing...' : 'Edit'}
          </button>

          <button
            className="ghost-button mic-button"
            onClick={() => void toggleVoiceCommandMic()}
            disabled={(status !== 'idle' && status !== 'listening') || (!speechSupported && status !== 'listening')}
            type="button"
          >
            {status === 'listening' ? 'Stop mic' : 'Mic'}
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <p className="micro-copy">
          One field stays active. Voice commands are just test input for rewrite instructions.
        </p>
      </section>
    </main>
  )
}
