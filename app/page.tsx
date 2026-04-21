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

const verdictLabels: Record<Verdict, string> = {
  'OK to send': 'OK to send',
  'Risky - revise': 'Risky',
  'Do not send yet': 'Do not send',
}

const STORAGE_KEY = 'safetosend.app.state.v1'

type PersistedState = {
  inputText: string
  audience: Audience
  goal: string
  currentDraft: string
  analysis: AnalysisResponse | null
  history: DraftSnapshot[]
  lastChangeNote: string
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
  const [inputText, setInputText] = useState('')
  const [audience, setAudience] = useState<Audience>('other')
  const [goal, setGoal] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [currentDraft, setCurrentDraft] = useState('')
  const [history, setHistory] = useState<DraftSnapshot[]>([])
  const [lastChangeNote, setLastChangeNote] = useState('Paste a draft to get a second opinion.')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'transforming'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [clientId, setClientId] = useState('anonymous')

  const lastAnalyzedDraftRef = useRef('')
  const draftOriginRef = useRef<'system' | 'manual'>('system')
  const analysisTimerRef = useRef<number | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    const persisted = loadPersistedState()

    if (persisted) {
      setInputText(persisted.inputText)
      setAudience(persisted.audience)
      setGoal(persisted.goal)
      setAnalysis(persisted.analysis)
      setCurrentDraft(persisted.currentDraft)
      setHistory(persisted.history)
      setLastChangeNote(persisted.lastChangeNote)
      setClientId(persisted.clientId || buildClientId())
      lastAnalyzedDraftRef.current = persisted.currentDraft || persisted.inputText
    } else {
      setClientId(buildClientId())
    }

    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    const state: PersistedState = {
      inputText,
      audience,
      goal,
      currentDraft,
      analysis,
      history,
      lastChangeNote,
      clientId,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [analysis, audience, clientId, currentDraft, goal, history, inputText, lastChangeNote])

  useEffect(() => {
    if (draftOriginRef.current !== 'manual') {
      return
    }

    if (status !== 'idle') {
      return
    }

    if (currentDraft.trim().length < 3) {
      return
    }

    if (currentDraft === lastAnalyzedDraftRef.current) {
      return
    }

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current)
    }

    analysisTimerRef.current = window.setTimeout(() => {
      void analyzeCurrentDraft(currentDraft)
    }, 700)

    return () => {
      if (analysisTimerRef.current) {
        window.clearTimeout(analysisTimerRef.current)
      }
    }
  }, [currentDraft, status])

  const verdictTone = useMemo(() => {
    if (!analysis) {
      return 'neutral'
    }

    return verdictStyle(analysis.verdict)
  }, [analysis])

  function pushHistorySnapshot(note: string) {
    const snapshot: DraftSnapshot = {
      draft: currentDraft || inputText,
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
        setCurrentDraft(result.suggestedText)
        lastAnalyzedDraftRef.current = result.suggestedText
      } else {
        lastAnalyzedDraftRef.current = textToAnalyze
      }

      setLastChangeNote(`Assistant updated: ${result.verdict}`)
      draftOriginRef.current = 'system'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setStatus('idle')
    }
  }

  async function runMainAnalysis() {
    const source = currentDraft.trim() || inputText.trim()

    if (source.length < 3) {
      setError('Paste a draft first.')
      return
    }

    if (currentDraft || analysis) {
      pushHistorySnapshot('Before new analysis')
    }

    await analyzeCurrentDraft(source, { commitDraft: true })
  }

  async function applyQuickAction(action: QuickAction) {
    const source = currentDraft.trim()

    if (source.length < 3) {
      setError('Run the analysis first.')
      return
    }

    setStatus('transforming')
    setError(null)
    pushHistorySnapshot(`Before ${action}`)

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

      setCurrentDraft(result.updatedText)
      setLastChangeNote(result.note)
      draftOriginRef.current = 'system'
      await analyzeCurrentDraft(result.updatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick action failed.')
    } finally {
      setStatus('idle')
    }
  }

  async function applyLocalEdit() {
    const source = currentDraft.trim()

    if (source.length < 3) {
      setError('Run the analysis first.')
      return
    }

    const instruction = (editInstructionRef.current?.value || '').trim()

    if (!instruction) {
      setError('Add an edit instruction.')
      return
    }

    setStatus('transforming')
    setError(null)
    pushHistorySnapshot('Before local edit')

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

      setCurrentDraft(result.updatedText)
      setLastChangeNote(result.note)
      draftOriginRef.current = 'system'
      if (editInstructionRef.current) {
        editInstructionRef.current.value = ''
      }
      await analyzeCurrentDraft(result.updatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed.')
    } finally {
      setStatus('idle')
    }
  }

  function undoLastChange() {
    const previous = history.at(-1)

    if (!previous) {
      return
    }

    setHistory((existing) => existing.slice(0, -1))
    setCurrentDraft(previous.draft)
    setAnalysis(previous.analysis)
    setLastChangeNote(previous.note)
    lastAnalyzedDraftRef.current = previous.draft
    draftOriginRef.current = 'system'
  }

  const editInstructionRef = useRef<HTMLTextAreaElement | null>(null)

  async function copyCurrentDraft() {
    const text = currentDraft.trim()

    if (!text) {
      return
    }

    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <main className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <section className="hero-bar">
        <div>
          <p className="eyebrow">SafeToSend</p>
          <h1>Second opinion before you send.</h1>
          <p className="subtle">
            Paste the draft, get a verdict, tighten the wording, and ship the safer version.
          </p>
        </div>
        <div className="status-pill">
          <span className={`status-dot ${status === 'idle' ? 'idle' : 'busy'}`} />
          <span>{status === 'idle' ? lastChangeNote : 'Working with the model'}</span>
        </div>
      </section>

      <section className="grid">
        <div className="panel input-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Draft</p>
              <h2>What are you about to send?</h2>
            </div>
            <div className="panel-hint">Model-first, no heuristics</div>
          </div>

          <label className="field">
            <span>Message draft</span>
            <textarea
              className="text-input draft-input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Why did you do it like this?"
            />
          </label>

          <div className="row">
            <label className="field grow">
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

            <label className="field grow">
              <span>Goal</span>
              <input
                className="control"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Ask for clarification"
              />
            </label>
          </div>

          <button
            className="primary-button"
            onClick={runMainAnalysis}
            disabled={status !== 'idle' || inputText.trim().length < 3}
            type="button"
          >
            {status === 'analyzing' ? 'Checking...' : 'Check before sending'}
          </button>

          {error ? <div className="error-banner">{error}</div> : null}
        </div>

        <div className="panel result-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Assistant</p>
              <h2>Risk, rewrite, and local edits</h2>
            </div>
            {analysis ? (
              <div className={`verdict-badge ${verdictTone}`}>{analysis.verdict}</div>
            ) : (
              <div className="verdict-badge neutral">Waiting</div>
            )}
          </div>

          {!analysis ? (
            <div className="empty-state">
              <p className="empty-title">Paste a draft and get a second opinion before you send it.</p>
              <p className="empty-copy">
                The assistant will return a verdict, concise reasons, and a safer rewrite.
              </p>
            </div>
          ) : (
            <div className="stack">
              <div className="analysis-card">
                <div className="analysis-topline">
                  <span className={`risk-chip ${analysis.riskLevel}`}>{analysis.riskLevel}</span>
                  <span>{verdictDescription(analysis.verdict)}</span>
                </div>
                <p className="analysis-meta">
                  Likely intent: {analysis.inferredGoal} · Confidence {Math.round(analysis.confidence * 100)}%
                </p>
                <ul className="reason-list">
                  {analysis.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>

              <label className="field">
                <span>Suggested message</span>
                <textarea
                  className="text-input suggestion-input"
                  value={currentDraft}
                  onChange={(event) => {
                    draftOriginRef.current = 'manual'
                    setCurrentDraft(event.target.value)
                  }}
                  placeholder="Your safer version appears here."
                />
              </label>

              <div className="quick-actions">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    className="secondary-button"
                    onClick={() => void applyQuickAction(action)}
                    disabled={status !== 'idle' || !currentDraft.trim()}
                    type="button"
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div className="edit-block">
                <label className="field">
                  <span>Local edit instruction</span>
                  <textarea
                    ref={editInstructionRef}
                    className="text-input edit-input"
                    placeholder='replace "review" with "look over"'
                  />
                </label>

                <div className="row action-row">
                  <button
                    className="secondary-button"
                    onClick={() => void applyLocalEdit()}
                    disabled={status !== 'idle' || !currentDraft.trim()}
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
                    disabled={!currentDraft.trim()}
                    type="button"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
