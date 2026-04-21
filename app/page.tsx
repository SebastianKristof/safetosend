'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AnalysisResponse,
  Audience,
  QuickAction,
  Verdict,
  TransformResponse,
} from '@/lib/assistant-contracts'
import type { DraftSnapshot } from '@/lib/assistant-client'

const audienceOptions: Array<{ value: Audience; label: string; helper: string }> = [
  { value: 'boss', label: 'Boss', helper: 'Short, clear, low-friction' },
  { value: 'client', label: 'Client', helper: 'Polished, careful, confident' },
  { value: 'colleague', label: 'Colleague', helper: 'Direct and collaborative' },
  { value: 'partner', label: 'Partner', helper: 'Warm and non-defensive' },
  { value: 'other', label: 'Other', helper: 'Neutral and adaptive' },
]

const quickActions: QuickAction[] = ['softer', 'firmer', 'shorter', 'more direct', 'more polite']

const STORAGE_KEY = 'safetosend.app.state.v1'

type PersistedState = {
  workingText: string
  audience: Audience
  goal: string
  analysis: AnalysisResponse | null
  history: DraftSnapshot[]
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

function verdictDescription(verdict: Verdict) {
  if (verdict === 'OK to send') {
    return 'The message is clear enough to send.'
  }

  if (verdict === 'Risky - revise') {
    return 'The message should be tightened before sending.'
  }

  return 'The message should be paused and calmed down first.'
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
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [history, setHistory] = useState<DraftSnapshot[]>([])
  const [lastChangeNote, setLastChangeNote] = useState('Paste, dictate, or generate a draft.')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'transforming' | 'listening'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [clientId, setClientId] = useState('anonymous')
  const [editInstruction, setEditInstruction] = useState('')
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
      setAnalysis(persisted.analysis)
      setHistory(persisted.history)
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
      analysis,
      history,
      lastChangeNote,
      clientId,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [analysis, audience, clientId, goal, history, lastChangeNote, workingText])

  const analysisTone = useMemo(() => {
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
        : status === 'transforming'
          ? 'Working'
          : draftIsStale
            ? 'Draft changed'
            : lastChangeNote

  function pushHistorySnapshot(note: string) {
    const snapshot: DraftSnapshot = {
      draft: workingText,
      analysis,
      note,
    }

    setHistory((existing) => [...existing, snapshot].slice(-20))
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

  async function runGenerate() {
    const seed = workingText.trim()

    if (!seed && !goal.trim()) {
      setError('Add a goal or some notes first.')
      return
    }

    pushHistorySnapshot('Before generate')
    setStatus('transforming')
    setError(null)

    try {
      const result = await postAssistant<TransformResponse>({
        mode: 'generate',
        text: seed,
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

      setWorkingText(result.updatedText)
      setLastChangeNote(result.note)
      lastAnalyzedDraftRef.current = result.updatedText
      await analyzeCurrentDraft(result.updatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.')
      setStatus('idle')
    }
  }

  async function runCheck() {
    const source = workingText.trim()

    if (source.length < 3) {
      setError('Paste a draft first.')
      return
    }

    pushHistorySnapshot('Before check')
    await analyzeCurrentDraft(source, { commitDraft: true })
  }

  async function applyQuickAction(action: QuickAction) {
    const source = workingText.trim()

    if (source.length < 3) {
      setError('Add a draft first.')
      return
    }

    pushHistorySnapshot(`Before ${action}`)
    setStatus('transforming')
    setError(null)

    try {
      const result = await postAssistant<TransformResponse>({
        mode: 'action',
        text: source,
        audience,
        goal,
        action,
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
      lastAnalyzedDraftRef.current = result.updatedText
      await analyzeCurrentDraft(result.updatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick action failed.')
      setStatus('idle')
    }
  }

  async function applyCustomEdit() {
    const source = workingText.trim()
    const instruction = editInstruction.trim()

    if (source.length < 3) {
      setError('Add a draft first.')
      return
    }

    if (!instruction) {
      setError('Add an edit instruction.')
      return
    }

    pushHistorySnapshot('Before edit')
    setStatus('transforming')
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
      setEditInstruction('')
      lastAnalyzedDraftRef.current = result.updatedText
      await analyzeCurrentDraft(result.updatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed.')
      setStatus('idle')
    }
  }

  function undoLastChange() {
    const previous = history.at(-1)

    if (!previous) {
      return
    }

    setHistory((existing) => existing.slice(0, -1))
    setWorkingText(previous.draft)
    setAnalysis(previous.analysis)
    setLastChangeNote(previous.note)
    lastAnalyzedDraftRef.current = previous.draft
  }

  async function copyCurrentDraft() {
    const text = workingText.trim()

    if (!text) {
      return
    }

    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
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

    setWorkingText((previous) => {
      const prefix = previous.trim()
      return prefix ? `${prefix} ${cleaned}` : cleaned
    })
  }

  async function toggleDictation() {
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
        setLastChangeNote('Dictation added text')
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
      setError(err instanceof Error ? err.message : 'Could not start dictation.')
    }
  }

  const verdictText = analysis ? verdictDescription(analysis.verdict) : 'No verdict yet'
  const verdictLabel = analysis ? analysis.verdict : 'Waiting'
  const riskLabel = analysis ? analysis.riskLevel : 'idle'

  return (
    <main className="page-shell">
      <header className="hero-bar">
        <div className="hero-copy">
          <p className="eyebrow">SafeToSend</p>
          <h1>One field. Fast second opinion.</h1>
          <p className="subtle">
            Paste, dictate, or generate in one place. The assistant keeps the message clear and
            safe to send.
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

        <label className="field">
          <span>Working text</span>
          <textarea
            className="text-input draft-input"
            value={workingText}
            onChange={(event) => {
              setWorkingText(event.target.value)
              setError(null)
            }}
            placeholder="Paste, type, dictate, or generate the message here."
          />
        </label>

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
          <button className="primary-button" onClick={() => void runGenerate()} type="button">
            {status === 'transforming' ? 'Working...' : 'Generate'}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runCheck()}
            disabled={status !== 'idle' || workingText.trim().length < 3}
            type="button"
          >
            {status === 'analyzing' ? 'Checking...' : 'Check'}
          </button>
          <button
            className="ghost-button"
            onClick={() => void toggleDictation()}
            disabled={!speechSupported && status !== 'listening'}
            type="button"
          >
            {status === 'listening' ? 'Stop' : 'Dictate'}
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <p className="micro-copy">
          One field stays active. The rest of the screen stays secondary.
        </p>

        <section className="analysis-card" aria-live="polite">
          <div className="analysis-topline">
            <span className={`verdict-pill ${analysisTone}`}>{verdictLabel}</span>
            <span className={`risk-chip ${riskLabel}`}>{riskLabel}</span>
          </div>
          <p className="analysis-meta">
            {analysis
              ? `Likely intent: ${analysis.inferredGoal} · Confidence ${Math.round(analysis.confidence * 100)}%`
              : 'Results appear here after you generate or check the message.'}
          </p>
          <p className="analysis-copy">{verdictText}</p>

          {analysis ? (
            <details className="analysis-details">
              <summary>Why this result</summary>
              <ul className="reason-list">
                {analysis.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="analysis-footnote">The rewritten text stays in the main field.</p>
            </details>
          ) : null}
        </section>

        <details className="advanced-panel">
          <summary>Refine and history</summary>
          <div className="advanced-body">
            <div className="chip-row">
              {quickActions.map((action) => (
                <button
                  key={action}
                  className="chip-button"
                  onClick={() => void applyQuickAction(action)}
                  disabled={status !== 'idle' || !workingText.trim()}
                  type="button"
                >
                  {action}
                </button>
              ))}
            </div>

            <label className="field">
              <span>Custom edit</span>
              <textarea
                className="text-input edit-input"
                value={editInstruction}
                onChange={(event) => setEditInstruction(event.target.value)}
                placeholder='replace "review" with "look over"'
              />
            </label>

            <div className="action-row">
              <button
                className="secondary-button"
                onClick={() => void applyCustomEdit()}
                disabled={status !== 'idle' || !workingText.trim()}
                type="button"
              >
                {status === 'transforming' ? 'Applying...' : 'Apply edit'}
              </button>
              <button
                className="ghost-button"
                onClick={undoLastChange}
                disabled={!history.length || status !== 'idle'}
                type="button"
              >
                Undo
              </button>
              <button
                className="ghost-button"
                onClick={() => void copyCurrentDraft()}
                disabled={!workingText.trim()}
                type="button"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </details>
      </section>
    </main>
  )
}
