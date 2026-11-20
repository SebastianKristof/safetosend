'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { stylePreferencesSchema } from '@/lib/assistant-contracts'
import type { AnalysisResponse, Audience, EditChange, EditResponse, Locale, StylePreferences } from '@/lib/assistant-contracts'
import type { DraftSnapshot } from '@/lib/assistant-client'
import type { HighlightSpan, EditorSelection } from '@/components/composer-controls'
import { buildAnalysisContextPayload, getLocalizedMeaning } from '@/lib/analysis-state'
import { MAX_DRAFT_CHARS } from '@/lib/draft-limits'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useTimedDictation } from '@/hooks/use-timed-dictation'
import { DEFAULT_STYLE, analysisInputKey } from '@/lib/style-preferences'
import { getStyleCopy } from '@/lib/style-copy'
import { getCopy } from '@/lib/ui-copy'
import { loadPersistedState, buildClientId, verdictStyle, localizedVerdict, buildAudienceOptions, normalizeAudience, defaultRewriteInstruction, mergeTranscribedText, transcribeBlob, MAX_RECORDING_SECONDS, MIN_TRANSCRIPTION_BYTES, STORAGE_KEY, postAssistant, type PersistedState } from '@/lib/composer-helpers'

export function useComposer() {
  const [workingText, setWorkingText] = useState('')
  const [audience, setAudience] = useState<Audience>('general')
  const [style, setStyle] = useState<StylePreferences>(DEFAULT_STYLE)
  const [analysisKey, setAnalysisKey] = useState('')
  const requestIdRef = useRef(0)
  const [voiceCommand, setVoiceCommand] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [analysisLocale, setAnalysisLocale] = useState<Locale | null>(null)
  const [version, setVersion] = useState(1)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [past, setPast] = useState<DraftSnapshot[]>([])
  const [future, setFuture] = useState<DraftSnapshot[]>([])
  const [lastChanges, setLastChanges] = useState<EditChange[]>([])
  const [lastChangeNote, setLastChangeNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'rewriting'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [clientId, setClientId] = useState('anonymous')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const voiceStopRequestedRef = useRef(false)
  const hydratedRef = useRef(false)
  const editorSelectionRef = useRef<EditorSelection | null>(null)
  const mobileReviewRef = useRef<HTMLElement | null>(null)
  const shouldRevealReviewRef = useRef(false)
  const recorder = useAudioRecorder()
  const {
    isSupported: voiceSupported,
    isRecording,
    isStarting,
    level,
    error: recorderError,
    start,
    stop,
    abort,
    clearError,
  } = recorder
  const copy = useMemo(() => getCopy(locale), [locale])
  const styleCopy = getStyleCopy(locale)
  const inputKey = analysisInputKey(workingText, audience, locale, style)
  const latestVoiceCommandRef = useRef(voiceCommand)
  latestVoiceCommandRef.current = voiceCommand
  const latestInputRef = useRef(inputKey)
  latestInputRef.current = inputKey
  const audienceOptions = useMemo(() => buildAudienceOptions(copy), [copy])
  const localeOptions = useMemo(
    () =>
      ([
        { value: 'en', label: copy.locales.en },
        { value: 'ru', label: copy.locales.ru },
        { value: 'es', label: copy.locales.es },
        { value: 'de', label: copy.locales.de },
        { value: 'fr', label: copy.locales.fr },
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
      setAudience(normalizeAudience(persisted.audience))
      setVoiceCommand(persisted.voiceCommand || '')
      setLocale(nextLocale)
      setAnalysisLocale(persisted.analysisLocale ?? null)
      setVersion(Math.max(1, persistedVersion || 0))
      setAnalysis(persisted.analysis)
      setStyle(stylePreferencesSchema.safeParse(persisted.style ?? {}).data ?? DEFAULT_STYLE)
      setAnalysisKey(persisted.analysisKey || '')
      setPast(persisted.past)
      setFuture(persisted.future)
      setLastChanges(persisted.lastChanges ?? [])
      setLastChangeNote(persisted.lastChangeNote)
      setClientId(persisted.clientId || buildClientId())
    } else {
      setClientId(buildClientId())
      setLocale(nextLocale)
      setAnalysisLocale(null)
      setVersion(1)
      setLastChangeNote(getCopy(nextLocale).status.startDraft)
    }
    hydratedRef.current = true
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
      style,
      analysisKey,
      audience,
      voiceCommand,
      locale,
      analysisLocale,
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
    style,
    analysisKey,
    audience,
    clientId,
    future,
    lastChangeNote,
    lastChanges,
    locale,
    past,
    version,
    voiceCommand,
    workingText,
    analysisLocale,
  ])
  useEffect(() => {
    if (!copied) {
      return
    }
    const timer = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])
  const draftIsStale = Boolean(analysis) && analysisKey !== inputKey
  // No LLM-generated text is allowed to leak across interface languages.
  const visibleAnalysis = analysis && !draftIsStale && analysisLocale === locale ? analysis : null
  const verdictTone = useMemo(() => {
    if (!visibleAnalysis) return 'neutral'
    return verdictStyle(visibleAnalysis.verdict)
  }, [visibleAnalysis])
  const draftTooLong = workingText.trim().length > MAX_DRAFT_CHARS
  const analysisHighlights = useMemo<HighlightSpan[]>(() => {
    if (!visibleAnalysis?.highlights?.length) return []
    return visibleAnalysis.highlights.map((highlight) => ({
      text: highlight.text,
      tone: highlight.severity,
      label: highlight.reason,
    }))
  }, [visibleAnalysis])
  const analysisHighlightReasons = useMemo(() => {
    if (!visibleAnalysis?.highlights?.length) return []
    return visibleAnalysis.highlights.map((highlight) => ({
      tone: highlight.severity,
      reason: highlight.reason,
    }))
  }, [visibleAnalysis])
  const rewriteHighlights = useMemo<HighlightSpan[]>(() => {
    if (analysisLocale !== locale) return []
    return lastChanges
      .filter((change) => change.after.trim())
      .map((change) => ({
        text: change.after,
        tone: 'green' as const,
        label: change.summary,
      }))
  }, [lastChanges, analysisLocale, locale])
  const localizedMeaning = useMemo(() => {
    return getLocalizedMeaning({ analysis: visibleAnalysis, analysisLocale, draftIsStale, locale })
  }, [visibleAnalysis, analysisLocale, draftIsStale, locale])
  const analysisContextPayload = useMemo(() => {
    return buildAnalysisContextPayload(visibleAnalysis)
  }, [visibleAnalysis])
  function currentSnapshot(note = lastChangeNote): DraftSnapshot {
    return {
      version,
      draft: workingText,
      analysis,
      analysisLocale,
      analysisKey,
      voiceCommand,
      note,
      changes: lastChanges,
    }
  }
  function checkpoint(note: string) {
    setPast((existing) => [...existing, currentSnapshot(note)])
    setFuture([])
  }
  // Draft dictation appends a new paragraph; the original message is never replaced.
  function addDictationToDraft(transcript: string) {
    const nextText = mergeTranscribedText(workingText, transcript)
    if (nextText === workingText) return
    checkpoint(copy.status.draftDictationAdded)
    editorSelectionRef.current = { start: nextText.length, end: nextText.length }
    setWorkingText(nextText)
    setVersion((current) => current + 1)
    setLastChangeNote(copy.status.draftDictationAdded)
    setLastChanges([])
    setError(null)
  }
  const draftDictation = useTimedDictation({
    maxSeconds: MAX_RECORDING_SECONDS,
    transcribe: transcribeBlob,
    onTranscript: addDictationToDraft,
  })
  async function analyzeCurrentDraft(
    textToAnalyze: string,
    options?: { preserveNote?: boolean; localeOverride?: Locale },
  ) {
    const preserveNote = options?.preserveNote ?? false
    const requestLocale = options?.localeOverride ?? locale
    const requestId = ++requestIdRef.current
    const expectedKey = analysisInputKey(textToAnalyze, audience, requestLocale, style)
    setStatus('analyzing')
    setError(null)
    try {
      const result = await postAssistant<AnalysisResponse>({
        mode: 'analyze',
        text: textToAnalyze,
        audience,
        style,
        locale: requestLocale,
        clientId,
        // A language change must not feed an analysis in the previous language back to the model.
        analysisContext: options?.localeOverride ? undefined : analysisContextPayload,
      }, getCopy(requestLocale).status.requestFailed)
      if (requestId !== requestIdRef.current || expectedKey !== latestInputRef.current) return
      setAnalysis(result)
      setAnalysisKey(expectedKey)
      setAnalysisLocale(requestLocale)
      if (!preserveNote || result.verdict !== 'Safe to send' || result.highlights.length || result.languageFixes.length) {
        setLastChangeNote(getCopy(requestLocale).status.analysisUpdated)
      }
    } catch (err) {
      if (requestId !== requestIdRef.current || expectedKey !== latestInputRef.current) return
      shouldRevealReviewRef.current = false
      setError(err instanceof Error ? err.message : getCopy(requestLocale).status.analysisFailed)
    } finally {
      if (requestId === requestIdRef.current) setStatus('idle')
    }
  }
  function changeInterfaceLanguage(nextLocale: Locale) {
    if (nextLocale === locale) return
    const draft = workingText.trim()
    const shouldRecheck = Boolean(analysis) || status === 'analyzing' || status === 'rewriting'

    // Invalidate any previous in-flight analysis/rewrite before changing state.
    requestIdRef.current += 1
    latestInputRef.current = analysisInputKey(workingText, audience, nextLocale, style)
    shouldRevealReviewRef.current = false
    setLocale(nextLocale)
    setAnalysis(null)
    setAnalysisKey('')
    setAnalysisLocale(null)
    setLastChanges([]) // these explanations were created in the previous language
    setLastChangeNote(getCopy(nextLocale).status.startDraft)
    setError(null)
    setStatus('idle')

    // Fresh analysis includes all explanatory text, language corrections,
    // reasons and a new verification translation for the *unchanged* draft.
    if (shouldRecheck && draft.length >= 3 && draft.length <= MAX_DRAFT_CHARS) {
      void analyzeCurrentDraft(draft, { preserveNote: true, localeOverride: nextLocale })
    }
  }

  async function runCheck() {
    const source = workingText.trim()
    if (source.length < 3) {
      setError(copy.errors.pasteFirst)
      return
    }
    if (source.length > MAX_DRAFT_CHARS) {
      return
    }
    shouldRevealReviewRef.current = true
    await analyzeCurrentDraft(source)
  }
  async function runRewrite(instructionOverride?: string) {
    const source = workingText.trim()
    const instruction = instructionOverride?.trim() || voiceCommand.trim() || defaultRewriteInstruction(locale, style)
    if (source.length < 3) {
      setError(copy.errors.addDraft)
      return
    }
    if (source.length > MAX_DRAFT_CHARS) {
      return
    }
    const requestId = ++requestIdRef.current
    const expectedKey = latestInputRef.current
    const expectedVoiceCommand = latestVoiceCommandRef.current
    shouldRevealReviewRef.current = true
    setStatus('rewriting')
    setError(null)
    try {
      const result = await postAssistant<EditResponse>({
        mode: 'edit',
        text: source,
        audience,
        style,
        locale,
        instruction,
        clientId,
        analysisContext: analysisContextPayload,
      }, copy.status.requestFailed)
      if (requestId !== requestIdRef.current || expectedKey !== latestInputRef.current || expectedVoiceCommand !== latestVoiceCommandRef.current) return
      if (result.updatedText === source) {
        setVoiceCommand('')
        setLastChanges([])
        setLastChangeNote(styleCopy.noChanges)
        await analyzeCurrentDraft(source, { preserveNote: true })
        return
      }
      checkpoint(copy.status.beforeRewrite)
      setVersion((current) => current + 1)
      editorSelectionRef.current = {
        start: result.updatedText.length,
        end: result.updatedText.length,
      }
      setWorkingText(result.updatedText)
      setVoiceCommand('')
      setLastChangeNote(result.changes.map((change) => change.summary).join(' · ') || copy.status.analysisUpdated)
      setLastChanges(result.changes)
      latestInputRef.current = analysisInputKey(result.updatedText, audience, locale, style)
      await analyzeCurrentDraft(result.updatedText, { preserveNote: true })
    } catch (err) {
      if (requestId !== requestIdRef.current || expectedKey !== latestInputRef.current || expectedVoiceCommand !== latestVoiceCommandRef.current) return
      shouldRevealReviewRef.current = false
      setError(err instanceof Error ? err.message : copy.status.rewriteFailed)
    } finally {
      if (requestId === requestIdRef.current) setStatus('idle')
    }
  }
  function undoLastChange() {
    const previous = past.at(-1)
    if (!previous) {
      return
    }
    setPast((existing) => existing.slice(0, -1))
    setFuture((existing) => [...existing, currentSnapshot()])
    editorSelectionRef.current = {
      start: previous.draft.length,
      end: previous.draft.length,
    }
    setWorkingText(previous.draft)
    setAnalysis(previous.analysis)
    setAnalysisLocale(previous.analysisLocale ?? null)
    setAnalysisKey(previous.analysisKey || '')
    setVoiceCommand(previous.voiceCommand || '')
    setLastChangeNote(previous.note)
    setLastChanges(previous.changes ?? [])
    setVersion(previous.version)
  }
  function redoLastChange() {
    const next = future.at(-1)
    if (!next) {
      return
    }
    setFuture((existing) => existing.slice(0, -1))
    setPast((existing) => [...existing, currentSnapshot()])
    editorSelectionRef.current = {
      start: next.draft.length,
      end: next.draft.length,
    }
    setWorkingText(next.draft)
    setAnalysis(next.analysis)
    setAnalysisLocale(next.analysisLocale ?? null)
    setAnalysisKey(next.analysisKey || '')
    setVoiceCommand(next.voiceCommand || '')
    setLastChangeNote(next.note)
    setLastChanges(next.changes ?? [])
    setVersion(next.version)
  }
  function clearDraft() {
    if (interactionBusy) return
    checkpoint(styleCopy.beforeClear)
    requestIdRef.current += 1
    setWorkingText('')
    setVoiceCommand('')
    setAnalysis(null)
    setAnalysisKey('')
    setAnalysisLocale(null)
    setLastChanges([])
    setLastChangeNote(styleCopy.cleared)
    setCopied(false)
    setError(null)
    clearError()
    shouldRevealReviewRef.current = false
    setVersion(current => current + 1)
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
      editorSelectionRef.current = {
        start: text.length,
        end: text.length,
      }
      setWorkingText(text)
      setLastChangeNote(copy.status.clipboardPasted)
      setLastChanges([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.pasteFailed)
    }
  }
  const stopAndTranscribe = useCallback(async () => {
    voiceStopRequestedRef.current = false
    const blob = await stop()
    if (!blob) {
      setError(copy.errors.couldNotStart)
      return
    }
    if (blob.size < MIN_TRANSCRIPTION_BYTES) {
      setError(copy.errors.voiceTooShort)
      return
    }
    setIsTranscribing(true)
    try {
      const transcript = await transcribeBlob(blob)
      setVoiceCommand(transcript)
      setLastChangeNote(copy.status.voiceCommandCaptured)
      setError(null)
      setIsTranscribing(false)
      await runRewrite(transcript)
    } catch (err) {
      setIsTranscribing(false)
      setError(err instanceof Error ? err.message : copy.errors.dictationFailed)
    }
  }, [
    copy.errors.couldNotStart,
    copy.errors.dictationFailed,
    copy.errors.voiceTooShort,
    copy.status.voiceCommandCaptured,
    runRewrite,
    stop,
  ])
  const startVoiceCapture = useCallback(
    async (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (status !== 'idle' || isRecording || isStarting || isTranscribing ||
        draftDictation.isRecording || draftDictation.isStarting || draftDictation.isTranscribing || !voiceSupported) {
        return
      }
      voiceStopRequestedRef.current = false
      setError(null)
      clearError()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // ignore
      }
      await start()
    },
    [clearError, draftDictation.isRecording, draftDictation.isStarting, draftDictation.isTranscribing, isRecording, isStarting, isTranscribing, start, status, voiceSupported],
  )
  const requestVoiceStop = useCallback(() => {
    voiceStopRequestedRef.current = true
    if (isRecording) {
      void stopAndTranscribe()
    }
  }, [isRecording, stopAndTranscribe])
  const cancelVoiceCapture = useCallback(() => {
    voiceStopRequestedRef.current = false
    if (isRecording || isStarting) {
      abort()
    }
  }, [abort, isRecording, isStarting])
  useEffect(() => {
    if (isRecording && voiceStopRequestedRef.current && !isTranscribing) {
      void stopAndTranscribe()
    }
  }, [isRecording, isTranscribing, stopAndTranscribe])
  const verdictLabel = draftIsStale ? styleCopy.stale : visibleAnalysis ? localizedVerdict(visibleAnalysis.verdict, copy) : copy.panel.ready
  const interactionBusy = status !== 'idle' || isRecording || isStarting || isTranscribing || draftDictation.isRecording || draftDictation.isStarting || draftDictation.isTranscribing
  // Reveal fresh results only after a requested analysis, not when restoring a saved draft.
  useEffect(() => {
    if (status !== 'idle' || !analysis || !shouldRevealReviewRef.current) return
    shouldRevealReviewRef.current = false
    if (!window.matchMedia('(max-width: 760px)').matches) return
    const panel = mobileReviewRef.current
    if (!panel) return
    const bounds = panel.getBoundingClientRect()
    // Keep the user's scroll position when the result is already in view.
    if (bounds.top >= 0 && bounds.top < window.innerHeight - 140) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panel.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }, [analysis, status])
  return { workingText, setWorkingText, audience, setAudience, voiceCommand, setVoiceCommand, style, setStyle, locale, setLocale: changeInterfaceLanguage, analysis, visibleAnalysis, past, future, status, error, setError, copied, isTranscribing, voiceSupported, isRecording, isStarting, level, recorderError, draftDictation, copy, styleCopy, audienceOptions, localeOptions, editorSelectionRef, mobileReviewRef, draftIsStale, draftTooLong, analysisHighlights, analysisHighlightReasons, rewriteHighlights, localizedMeaning, verdictTone, verdictLabel, interactionBusy, runCheck, runRewrite, undoLastChange, redoLastChange, copyWorkingText, pasteIntoDraft, clearDraft, startVoiceCapture, requestVoiceStop, cancelVoiceCapture, setLastChanges, lastChanges, lastChangeNote }
}
