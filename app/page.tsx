'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AnalysisResponse,
  Audience,
  Locale,
  TransformChange,
  TransformResponse,
  Verdict,
} from '@/lib/assistant-contracts'
import type { DraftSnapshot } from '@/lib/assistant-client'

const STORAGE_KEY = 'safetosend.app.state.v2'

const UI_COPY = {
  en: {
    hero: {
      eyebrow: 'SafeToSend',
      title: 'Is it safe to send?',
      subtitle: 'Your second pair of eyes before sending.',
    },
    panel: {
      kicker: 'Composer',
      title: 'The message lives here.',
      ready: 'Ready',
      resultsPlaceholder: 'Results appear here after you check or rewrite the message.',
      likelyIntent: 'Likely intent',
      confidence: 'Confidence',
      reasons: 'Reasons',
      changes: 'What changed',
    },
    fields: {
      interfaceLanguage: 'Interface language',
      workingText: 'Working text',
      audience: 'Audience',
      goal: 'Goal',
      voice: 'Voice commands',
    },
    placeholders: {
      workingText: 'Paste, type, or rewrite the message here.',
      goal: 'Ask for clarification',
      voice: 'make it shorter and less blunt',
    },
    buttons: {
      undo: 'Undo',
      redo: 'Redo',
      copy: 'Copy',
      copied: 'Copied',
      paste: 'Paste',
      check: 'Check',
      checking: 'Checking...',
      submit: 'Rewrite',
      submitting: 'Rewriting...',
      mic: 'Mic',
      stopMic: 'Stop mic',
    },
    status: {
      idle: 'Ready',
      analyzing: 'Checking',
      rewriting: 'Rewriting',
      listening: 'Listening',
      draftChanged: 'Draft changed',
      startDraft: 'Paste, type, or write a draft.',
      beforeCheck: 'Before check',
      beforePaste: 'Before paste',
      beforeRewrite: 'Before rewrite',
      clipboardPasted: 'Clipboard pasted',
      voiceCommandCaptured: 'Voice command captured',
      draftCopied: 'Draft copied',
      analysisUpdated: 'Analysis updated',
      requestFailed: 'AI request failed.',
      analysisFailed: 'Analysis failed.',
      rewriteFailed: 'Rewrite failed.',
    },
    verdicts: {
      ok: 'OK to send',
      risky: 'Risky - revise',
      hold: 'Do not send yet',
    },
    risks: {
      low: 'low',
      medium: 'medium',
      high: 'high',
    },
    audiences: {
      boss: { label: 'Boss', helper: 'Short, clear, low-friction' },
      client: { label: 'Client', helper: 'Polished, careful, confident' },
      colleague: { label: 'Colleague', helper: 'Direct and collaborative' },
      partner: { label: 'Partner', helper: 'Warm and non-defensive' },
      other: { label: 'Other', helper: 'Neutral and adaptive' },
    },
    analysis: {
      likelyIntent: 'Likely intent',
      confidence: 'Confidence',
      resultsPlaceholder: 'Results appear here after you check or rewrite the message.',
      analysisHighlights: 'Questionable parts',
      rewriteHighlights: 'Rewritten parts',
    },
    changes: {
      title: 'What changed',
      summary: 'Change',
      added: 'Added',
      removed: 'Removed',
      replaced: 'Replaced',
      from: 'From',
      to: 'To',
    },
    locales: {
      en: 'EN',
      ru: 'RU',
    },
    errors: {
      pasteFirst: 'Paste a draft first.',
      addDraft: 'Add a draft first.',
      nothingToCopy: 'Nothing to copy.',
      clipboardEmpty: 'Clipboard is empty.',
      copyFailed: 'Copy failed.',
      pasteFailed: 'Paste failed.',
      dictationUnsupported: 'Speech recognition is not available in this browser.',
      dictationFailed: 'Dictation failed',
      couldNotStart: 'Could not start voice capture.',
    },
  },
  ru: {
    hero: {
      eyebrow: 'SafeToSend',
      title: 'Безопасно ли отправлять?',
      subtitle: 'Вторая пара глаз перед отправкой.',
    },
    panel: {
      kicker: 'Черновик',
      title: 'Здесь живет сообщение.',
      ready: 'Готово',
      resultsPlaceholder: 'Результат появится после проверки или правки сообщения.',
      likelyIntent: 'Вероятная цель',
      confidence: 'Уверенность',
      reasons: 'Причины',
      changes: 'Что изменилось',
    },
    fields: {
      interfaceLanguage: 'Язык интерфейса',
      workingText: 'Текст',
      audience: 'Адресат',
      goal: 'Цель',
      voice: 'Голосовые команды',
    },
    placeholders: {
      workingText: 'Вставьте, напечатайте или перепишите сообщение здесь.',
      goal: 'Например: попросить уточнение',
      voice: 'сделай короче и мягче',
    },
    buttons: {
      undo: 'Отмена',
      redo: 'Повтор',
      copy: 'Копировать',
      copied: 'Скопировано',
      paste: 'Вставить',
      check: 'Проверить',
      checking: 'Проверяем...',
      submit: 'Переписать',
      submitting: 'Переписываем...',
      mic: 'Микрофон',
      stopMic: 'Стоп',
    },
    status: {
      idle: 'Готово',
      analyzing: 'Проверяем',
      rewriting: 'Правим',
      listening: 'Слушаю',
      draftChanged: 'Черновик изменён',
      startDraft: 'Вставьте, напечатайте или напишите черновик.',
      beforeCheck: 'Перед проверкой',
      beforePaste: 'Перед вставкой',
      beforeRewrite: 'Перед переписыванием',
      clipboardPasted: 'Текст вставлен',
      voiceCommandCaptured: 'Голосовая команда распознана',
      draftCopied: 'Текст скопирован',
      analysisUpdated: 'Проверка обновлена',
      requestFailed: 'Запрос к ИИ не удался.',
      analysisFailed: 'Не удалось проверить текст.',
      rewriteFailed: 'Не удалось переписать текст.',
    },
    verdicts: {
      ok: 'Можно отправлять',
      risky: 'Нужно доработать',
      hold: 'Пока не отправлять',
    },
    risks: {
      low: 'низкий',
      medium: 'средний',
      high: 'высокий',
    },
    audiences: {
      boss: { label: 'Руководитель', helper: 'Коротко, ясно, без лишнего' },
      client: { label: 'Клиент', helper: 'Аккуратно, уверенно, вежливо' },
      colleague: { label: 'Коллега', helper: 'Прямо и по делу' },
      partner: { label: 'Партнёр', helper: 'Тепло и без защиты' },
      other: { label: 'Другое', helper: 'Нейтрально и гибко' },
    },
    analysis: {
      likelyIntent: 'Вероятная цель',
      confidence: 'Уверенность',
      resultsPlaceholder: 'Результат появится после проверки или правки сообщения.',
      analysisHighlights: 'Проблемные места',
      rewriteHighlights: 'Переписанные фрагменты',
    },
    changes: {
      title: 'Что изменилось',
      summary: 'Изменение',
      added: 'Добавлено',
      removed: 'Удалено',
      replaced: 'Заменено',
      from: 'Было',
      to: 'Стало',
    },
    locales: {
      en: 'EN',
      ru: 'RU',
    },
    errors: {
      pasteFirst: 'Сначала вставьте черновик.',
      addDraft: 'Сначала добавьте черновик.',
      nothingToCopy: 'Копировать нечего.',
      clipboardEmpty: 'Буфер обмена пуст.',
      copyFailed: 'Не удалось скопировать текст.',
      pasteFailed: 'Не удалось вставить текст.',
      dictationUnsupported: 'Распознавание речи недоступно в этом браузере.',
      dictationFailed: 'Не удалось распознать речь',
      couldNotStart: 'Не удалось запустить запись голоса.',
    },
  },
} as const

type Copy = (typeof UI_COPY)[Locale]

type PersistedState = {
  workingText: string
  audience: Audience
  goal: string
  voiceCommand: string
  locale?: Locale
  version?: number
  analysis: AnalysisResponse | null
  past: DraftSnapshot[]
  future: DraftSnapshot[]
  lastChangeNote: string
  lastChanges?: TransformChange[]
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

function getCopy(locale: Locale): Copy {
  return UI_COPY[locale]
}

function localizedVerdict(verdict: Verdict, copy: Copy) {
  if (verdict === 'OK to send') {
    return copy.verdicts.ok
  }

  if (verdict === 'Risky - revise') {
    return copy.verdicts.risky
  }

  return copy.verdicts.hold
}

function localizedRisk(risk: AnalysisResponse['riskLevel'], copy: Copy) {
  if (risk === 'low') {
    return copy.risks.low
  }

  if (risk === 'medium') {
    return copy.risks.medium
  }

  return copy.risks.high
}

function buildAudienceOptions(copy: Copy): Array<{ value: Audience; label: string; helper: string }> {
  return [
    { value: 'boss', label: copy.audiences.boss.label, helper: copy.audiences.boss.helper },
    { value: 'client', label: copy.audiences.client.label, helper: copy.audiences.client.helper },
    { value: 'colleague', label: copy.audiences.colleague.label, helper: copy.audiences.colleague.helper },
    { value: 'partner', label: copy.audiences.partner.label, helper: copy.audiences.partner.helper },
    { value: 'other', label: copy.audiences.other.label, helper: copy.audiences.other.helper },
  ]
}

function defaultRewriteInstruction(locale: Locale) {
  if (locale === 'ru') {
    return 'Перепиши текст яснее, спокойнее и так, чтобы его можно было отправить, не меняя язык черновика.'
  }

  return 'Rewrite this to be clearer, calmer, and ready to send while keeping the draft text in English.'
}

type HighlightTone = 'yellow' | 'red' | 'green'

type HighlightSpan = {
  text: string
  tone: HighlightTone
  label: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightSegments(text: string, highlights: HighlightSpan[]) {
  const matchSegments = highlights
    .flatMap((highlight, index) => {
      const needle = highlight.text.trim()
      if (!needle) {
        return []
      }

      const pattern = new RegExp(escapeRegExp(needle), 'gi')
      const matches: Array<{ start: number; end: number; highlight: HighlightSpan; index: number }> = []
      let match: RegExpExecArray | null

      while ((match = pattern.exec(text))) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          highlight,
          index,
        })

        if (match.index === pattern.lastIndex) {
          pattern.lastIndex += 1
        }
      }

      return matches
    })
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start
      }

      if (right.end !== left.end) {
        return right.end - left.end
      }

      return left.index - right.index
    })

  const accepted: typeof matchSegments = []
  let cursor = 0

  for (const segment of matchSegments) {
    if (segment.start < cursor) {
      continue
    }

    accepted.push(segment)
    cursor = segment.end
  }

  const pieces: Array<
    | { kind: 'text'; value: string }
    | { kind: 'highlight'; value: string; tone: HighlightTone; label: string }
  > = []

  let lastIndex = 0
  for (const segment of accepted) {
    if (segment.start > lastIndex) {
      pieces.push({ kind: 'text', value: text.slice(lastIndex, segment.start) })
    }

    pieces.push({
      kind: 'highlight',
      value: text.slice(segment.start, segment.end),
      tone: segment.highlight.tone,
      label: segment.highlight.label,
    })
    lastIndex = segment.end
  }

  if (lastIndex < text.length) {
    pieces.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return pieces
}

function HighlightedText({
  text,
  highlights,
  emptyLabel,
}: {
  text: string
  highlights: HighlightSpan[]
  emptyLabel: string
}) {
  const segments = buildHighlightSegments(text, highlights)

  if (!segments.length) {
    return <p className="analysis-empty">{emptyLabel}</p>
  }

  return (
    <p className="highlight-text">
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <span key={`${segment.value}-${index}`}>{segment.value}</span>
        }

        return (
          <mark
            key={`${segment.value}-${index}`}
            className={`highlight-mark ${segment.tone}`}
            title={segment.label}
          >
            {segment.value}
          </mark>
        )
      })}
    </p>
  )
}

async function postAssistant<T>(body: Record<string, unknown>, fallbackError: string) {
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

export default function Page() {
  const [workingText, setWorkingText] = useState('')
  const [audience, setAudience] = useState<Audience>('other')
  const [goal, setGoal] = useState('')
  const [voiceCommand, setVoiceCommand] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [version, setVersion] = useState(1)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [past, setPast] = useState<DraftSnapshot[]>([])
  const [future, setFuture] = useState<DraftSnapshot[]>([])
  const [lastChanges, setLastChanges] = useState<TransformChange[]>([])
  const [lastChangeNote, setLastChangeNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'rewriting' | 'listening'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [clientId, setClientId] = useState('anonymous')
  const [speechSupported, setSpeechSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionController | null>(null)
  const hydratedRef = useRef(false)
  const lastAnalyzedDraftRef = useRef('')
  const copy = useMemo(() => getCopy(locale), [locale])
  const audienceOptions = useMemo(() => buildAudienceOptions(copy), [copy])
  const localeOptions = useMemo(
    () =>
      ([
        { value: 'en', label: copy.locales.en },
        { value: 'ru', label: copy.locales.ru },
      ] as const),
    [copy],
  )

  useEffect(() => {
    const persisted = loadPersistedState()
    const nextLocale = persisted?.locale ?? 'en'
    const persistedVersion =
      persisted?.version ??
      Math.max(
        0,
        ...((persisted?.past ?? []).map((snapshot) => snapshot.version ?? 0) ?? []),
        ...((persisted?.future ?? []).map((snapshot) => snapshot.version ?? 0) ?? []),
      )

    if (persisted) {
      setWorkingText(persisted.workingText)
      setAudience(persisted.audience)
      setGoal(persisted.goal)
      setVoiceCommand(persisted.voiceCommand || '')
      setLocale(nextLocale)
      setVersion(Math.max(1, persistedVersion || 0))
      setAnalysis(persisted.analysis)
      setPast(persisted.past)
      setFuture(persisted.future)
      setLastChanges(persisted.lastChanges ?? [])
      setLastChangeNote(persisted.lastChangeNote)
      setClientId(persisted.clientId || buildClientId())
      lastAnalyzedDraftRef.current = persisted.workingText
    } else {
      setClientId(buildClientId())
      setLocale(nextLocale)
      setVersion(1)
      setLastChangeNote(getCopy(nextLocale).status.startDraft)
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
    document.documentElement.lang = locale
    document.title = `${copy.hero.eyebrow} — ${copy.hero.title}`
  }, [copy.hero.eyebrow, copy.hero.title, locale])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    const state: PersistedState = {
      workingText,
      audience,
      goal,
      voiceCommand,
      locale,
      analysis,
      past,
      future,
      lastChangeNote,
      lastChanges,
      version,
      clientId,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [
    analysis,
    audience,
    clientId,
    future,
    goal,
    lastChangeNote,
    lastChanges,
    locale,
    past,
    version,
    voiceCommand,
    workingText,
  ])

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
      ? copy.status.listening
      : status === 'analyzing'
        ? copy.status.analyzing
        : status === 'rewriting'
          ? copy.status.rewriting
          : draftIsStale
            ? copy.status.draftChanged
            : lastChangeNote

  function currentSnapshot(note = lastChangeNote): DraftSnapshot {
    return {
      version,
      draft: workingText,
      analysis,
      note,
      changes: lastChanges,
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
        locale,
        clientId,
        analysisContext: analysis
          ? {
              verdict: analysis.verdict,
              reasons: analysis.reasons,
              inferredGoal: analysis.inferredGoal,
            }
          : undefined,
      }, copy.status.requestFailed)

      setAnalysis(result)

      if (commitDraft) {
        setWorkingText(result.suggestedText)
        lastAnalyzedDraftRef.current = result.suggestedText
      } else {
        lastAnalyzedDraftRef.current = textToAnalyze
      }

      setLastChangeNote(copy.status.analysisUpdated)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.status.analysisFailed)
    } finally {
      setStatus('idle')
    }
  }

  async function runCheck() {
    const source = workingText.trim()

    if (source.length < 3) {
      setError(copy.errors.pasteFirst)
      return
    }

    checkpoint(copy.status.beforeCheck)
    await analyzeCurrentDraft(source)
  }

  async function runRewrite() {
    const source = workingText.trim()
    const instruction = voiceCommand.trim() || defaultRewriteInstruction(locale)

    if (source.length < 3) {
      setError(copy.errors.addDraft)
      return
    }

    checkpoint(copy.status.beforeRewrite)
    setStatus('rewriting')
    setError(null)

    try {
      const result = await postAssistant<TransformResponse>({
        mode: 'edit',
        text: source,
        audience,
        goal,
        locale,
        instruction,
        clientId,
        analysisContext: analysis
          ? {
              verdict: analysis.verdict,
              reasons: analysis.reasons,
              inferredGoal: analysis.inferredGoal,
            }
          : undefined,
      }, copy.status.requestFailed)

      setVersion((current) => current + 1)
      setWorkingText(result.updatedText)
      setLastChangeNote(result.note)
      setLastChanges(result.changes)
      setVoiceCommand('')
      lastAnalyzedDraftRef.current = result.updatedText
      await analyzeCurrentDraft(result.updatedText)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.status.rewriteFailed)
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
    setLastChanges(previous.changes ?? [])
    setVersion(previous.version)
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
    setLastChanges(next.changes ?? [])
    setVersion(next.version)
    lastAnalyzedDraftRef.current = next.draft
  }

  async function copyWorkingText() {
    const text = workingText.trim()

    if (!text) {
      setError(copy.errors.nothingToCopy)
      return
    }

    try {
      await navigator.clipboard.writeText(workingText)
      setCopied(true)
      setLastChangeNote(copy.status.draftCopied)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.copyFailed)
    }
  }

  async function pasteIntoDraft() {
    if (status !== 'idle') {
      return
    }

    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        setError(copy.errors.clipboardEmpty)
        return
      }

      checkpoint(copy.status.beforePaste)
      setWorkingText(text)
      setLastChangeNote(copy.status.clipboardPasted)
      setLastChanges([])
      lastAnalyzedDraftRef.current = text
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.pasteFailed)
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
      setError(copy.errors.dictationUnsupported)
      return
    }

    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      setError(copy.errors.dictationUnsupported)
      return
    }

    if (!recognitionRef.current) {
      const recognition = new Recognition()
      recognition.lang = locale === 'ru' ? 'ru-RU' : 'en-US'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results ?? [])
          .map((result: any) => result?.[0]?.transcript || '')
          .join(' ')
        appendTranscript(transcript)
        setLastChangeNote(copy.status.voiceCommandCaptured)
      }
      recognition.onerror = (event: any) => {
        setError(`${copy.errors.dictationFailed}${event?.error ? `: ${event.error}` : '.'}`)
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
      setError(err instanceof Error ? err.message : copy.errors.couldNotStart)
    }
  }

    const verdictLabel = analysis ? localizedVerdict(analysis.verdict, copy) : copy.panel.ready
    const riskLabel = analysis ? localizedRisk(analysis.riskLevel, copy) : '—'

  return (
    <main className="page-shell">
      <header className="hero-bar">
        <div className="hero-copy">
          <p className="eyebrow">{copy.hero.eyebrow}</p>
          <h1>{copy.hero.title}</h1>
          <p className="subtle">{copy.hero.subtitle}</p>
        </div>
        <div className="status-pill" aria-live="polite">
          <span className={`status-dot ${status === 'idle' ? 'idle' : 'busy'}`} />
          <span>{statusText}</span>
        </div>
      </header>

      <section className="panel composer-card">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">{copy.panel.kicker}</p>
            <h2>{copy.panel.title}</h2>
          </div>
          <div className={`analysis-badge ${draftIsStale ? 'stale' : 'fresh'}`}>
            {analysis ? verdictLabel : copy.panel.ready}
          </div>
        </div>

        <section className="analysis-card" aria-live="polite">
          <div className="analysis-topline">
            <span className={`verdict-pill ${verdictTone}`}>{verdictLabel}</span>
            <span className={`risk-chip ${riskLabel}`}>{riskLabel}</span>
          </div>
          <p className="analysis-meta">
            {analysis
              ? `${copy.analysis.likelyIntent}: ${analysis.inferredGoal} · ${copy.analysis.confidence} ${Math.round(analysis.confidence * 100)}%`
              : copy.analysis.resultsPlaceholder}
          </p>
          {analysis ? (
            <div className="analysis-reasons">
              <p className="analysis-reasons-label">{copy.panel.reasons}</p>
              <ul className="reason-list">
                {analysis.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {analysis?.highlights?.length ? (
          <section className="analysis-card highlight-card" aria-live="polite">
            <p className="analysis-reasons-label">{copy.analysis.analysisHighlights}</p>
            <HighlightedText
              text={workingText}
              highlights={analysis.highlights.map((highlight) => ({
                text: highlight.text,
                tone: highlight.severity,
                label: highlight.reason,
              }))}
              emptyLabel={copy.analysis.resultsPlaceholder}
            />
          </section>
        ) : null}

        <div className="editor-shell">
          <label className="field editor-field">
            <span>{copy.fields.workingText}</span>
            <textarea
              className="text-input draft-input"
              value={workingText}
              onChange={(event) => {
                setWorkingText(event.target.value)
                setError(null)
                setLastChanges([])
              }}
              placeholder={copy.placeholders.workingText}
              />
          </label>

          <div className="history-rail" aria-label={copy.panel.changes}>
            <button
              className="ghost-button rail-button"
              onClick={undoLastChange}
              disabled={!past.length || status !== 'idle'}
              type="button"
            >
              {copy.buttons.undo}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={redoLastChange}
              disabled={!future.length || status !== 'idle'}
              type="button"
            >
              {copy.buttons.redo}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void copyWorkingText()}
              disabled={status !== 'idle' || !workingText.trim()}
              type="button"
            >
              {copied ? copy.buttons.copied : copy.buttons.copy}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void pasteIntoDraft()}
              disabled={status !== 'idle'}
              type="button"
            >
              {copy.buttons.paste}
            </button>
          </div>
        </div>

        <div className="locale-row" aria-label={copy.fields.interfaceLanguage}>
          <span className="locale-label">{copy.fields.interfaceLanguage}</span>
          <div className="locale-switch">
            {localeOptions.map((option) => (
              <button
                key={option.value}
                className={`chip-button ${locale === option.value ? 'selected' : ''}`}
                onClick={() => setLocale(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-grid">
          <label className="field">
            <span>{copy.fields.audience}</span>
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
            <span>{copy.fields.goal}</span>
            <input
              className="control"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder={copy.placeholders.goal}
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
            {status === 'analyzing' ? copy.buttons.checking : copy.buttons.check}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runRewrite()}
            disabled={status !== 'idle' || !workingText.trim()}
            type="button"
          >
            {status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
          </button>
        </div>

        <div className="voice-row">
          <label className="field grow">
            <span>{copy.fields.voice}</span>
            <input
              className="control"
              value={voiceCommand}
              onChange={(event) => setVoiceCommand(event.target.value)}
              placeholder={copy.placeholders.voice}
            />
          </label>

          <button
            className="secondary-button edit-button"
            onClick={() => void runRewrite()}
            disabled={status !== 'idle' || !workingText.trim()}
            type="button"
          >
            {status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
          </button>

          <button
            className="ghost-button mic-button"
            onClick={() => void toggleVoiceCommandMic()}
            disabled
            type="button"
          >
            {status === 'listening' ? copy.buttons.stopMic : copy.buttons.mic}
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {lastChanges.length ? (
          <section className="analysis-card version-card" aria-live="polite">
            <div className="analysis-topline">
              <span className="verdict-pill neutral">
                {copy.changes.title} · v{version}
              </span>
            </div>
            <p className="analysis-reasons-label">{copy.analysis.rewriteHighlights}</p>
            <HighlightedText
              text={workingText}
              highlights={lastChanges
                .map((change) =>
                  change.after.trim()
                    ? ({
                        text: change.after,
                        tone: 'green',
                        label: change.summary,
                      } as const)
                    : null,
                )
                .filter(Boolean) as HighlightSpan[]}
              emptyLabel={copy.analysis.resultsPlaceholder}
            />
            <ul className="change-list">
              {lastChanges.map((change, index) => (
                <li key={`${change.summary}-${index}`} className="change-item">
                  <p className="change-summary">{change.summary}</p>
                  <div className="change-span-row">
                    <span className="change-chip change-from">
                      <span className="change-chip-label">{copy.changes.from}</span>
                      <span>{change.before || '—'}</span>
                    </span>
                    <span className="change-arrow">→</span>
                    <span className="change-chip change-to">
                      <span className="change-chip-label">{copy.changes.to}</span>
                      <span>{change.after || '—'}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </section>
    </main>
  )
}
