'use client'
import type { Locale } from '@/lib/assistant-contracts'
import { useComposer } from '@/hooks/use-composer'
import { MAX_DRAFT_CHARS } from '@/lib/draft-limits'
import { StyleControls } from '@/components/style-controls'
import { ReviewPanel } from '@/components/review-panel'
import { RewriteIcon, UndoIcon, RedoIcon, CopyIcon, PasteIcon, CheckIcon, MicIcon, StopGlyph, DraftEditor, AudienceDropdown } from '@/components/composer-controls'

export default function Page() {
  const model = useComposer()
  const { workingText, setWorkingText, audience, setAudience, voiceCommand, setVoiceCommand, style, setStyle, locale, setLocale, analysis, past, future, status, error, setError, copied, isTranscribing, voiceSupported, isRecording, isStarting, level, recorderError, draftDictation, copy, styleCopy, audienceOptions, localeOptions, editorSelectionRef, mobileReviewRef, draftIsStale, draftTooLong, analysisHighlights, analysisHighlightReasons, rewriteHighlights, localizedMeaning, verdictTone, verdictLabel, interactionBusy, runCheck, runRewrite, undoLastChange, redoLastChange, copyWorkingText, pasteIntoDraft, clearDraft, startVoiceCapture, requestVoiceStop, cancelVoiceCapture, setLastChanges, lastChanges, lastChangeNote } = model

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none">
              <path d="M8 19.5 15.2 26 28 10" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="brand-name">{copy.hero.eyebrow}</span>
        </div>
        <div className="hero-actions">
          <label className="header-language" htmlFor="ui-language">
            <span className="sr-only">{copy.fields.interfaceLanguage}</span>
            <select
              id="ui-language"
              className="control header-select"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="hero-bar">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-indicator" aria-hidden="true" /> {copy.hero.subtitle}</p>
          <h1>{copy.hero.title}</h1>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-line art-line-one" />
          <span className="art-line art-line-two" />
          <span className="art-line art-line-three" />
          <span className="art-spark">✳</span>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="panel composer-card">
          <div className="section-head">
            <span className="step-number">01</span>
            <div className="section-heading"><span className="section-title">{copy.workspace.draft}</span><span className="section-subtitle">{copy.panel.kicker}</span></div>
          </div>
        <div className="editor-shell">
          <div className="field editor-field">
            <div className="draft-field-heading">
              <label htmlFor="main-draft">{copy.fields.workingText}</label>
              <button type="button" className="clear-button" onClick={clearDraft}
                disabled={interactionBusy || !(workingText || voiceCommand || analysis || lastChanges.length)}>{styleCopy.clear}</button>
              <button
                type="button"
                className={`draft-dictation-button ${draftDictation.isRecording ? 'is-recording' : ''}`}
                onClick={() => void (draftDictation.isRecording ? draftDictation.stop() : draftDictation.start())}
                disabled={
                  draftDictation.isTranscribing ||
                  draftDictation.isStarting ||
                  (!draftDictation.isRecording && (status !== 'idle' || isRecording || isStarting || isTranscribing || !draftDictation.isSupported))
                }
                aria-pressed={draftDictation.isRecording}
                title={draftDictation.isSupported ? copy.buttons.dictationHint : copy.errors.dictationUnsupported}
              >
                {draftDictation.isTranscribing ? <span className="voice-spinner" aria-hidden="true" /> : draftDictation.isRecording ? <StopGlyph /> : <MicIcon />}
                <span>
                  {draftDictation.isTranscribing
                    ? copy.buttons.transcribingDraft
                    : draftDictation.isRecording
                      ? `${copy.buttons.stopDraftDictation} · ${Math.floor(draftDictation.remainingSeconds / 60)}:${String(draftDictation.remainingSeconds % 60).padStart(2, '0')}`
                      : draftDictation.isStarting
                        ? copy.status.listening
                        : copy.buttons.dictateDraft}
                </span>
              </button>
            </div>
            <div className="editor-surface">
              <DraftEditor
                value={workingText}
                analysisHighlights={analysisHighlights}
                rewriteHighlights={rewriteHighlights}
                placeholder={copy.placeholders.workingText}
                selectionRef={editorSelectionRef}
                onChange={(nextValue) => {
                  setWorkingText(nextValue)
                  setError(null)
                  setLastChanges([])
                }}
              />
            </div>
            <div className="draft-field-meta">
              <p className={`draft-dictation-hint ${!draftDictation.isSupported ? 'mic-unavailable' : ''}`}>{draftDictation.isSupported ? copy.buttons.dictationHint : copy.errors.dictationUnsupported}</p>
              <span
                className={`draft-char-counter ${draftTooLong ? 'over-limit' : ''}`}
                aria-label={`${copy.fields.characterCount}: ${workingText.trim().length} / ${MAX_DRAFT_CHARS}`}
              >
                {workingText.trim().length.toLocaleString(locale)} / {MAX_DRAFT_CHARS.toLocaleString(locale)}
              </span>
            </div>
            {draftTooLong ? <p className="field-warning" role="status">{copy.errors.draftTooLong}</p> : null}
          </div>

          <div className="history-rail" aria-label={copy.panel.changes}>
            <button
              className="ghost-button rail-button"
              onClick={undoLastChange}
              disabled={!past.length || interactionBusy}
              type="button"
              title={copy.buttons.undo}
              aria-label={copy.buttons.undo}
            >
              <UndoIcon />
            </button>
            <button
              className="ghost-button rail-button"
              onClick={redoLastChange}
              disabled={!future.length || interactionBusy}
              type="button"
              title={copy.buttons.redo}
              aria-label={copy.buttons.redo}
            >
              <RedoIcon />
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void copyWorkingText()}
              disabled={interactionBusy || !workingText.trim()}
              type="button"
              title={copied ? copy.buttons.copied : copy.buttons.copy}
              aria-label={copied ? copy.buttons.copied : copy.buttons.copy}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void pasteIntoDraft()}
              disabled={interactionBusy}
              type="button"
              title={copy.buttons.paste}
              aria-label={copy.buttons.paste}
            >
              <PasteIcon />
            </button>
          </div>
        </div>

          {lastChangeNote === styleCopy.cleared || lastChangeNote === styleCopy.noChanges ? <p className="composer-note" role="status">{lastChangeNote}</p> : null}
          <div className="composer-actions">
        <div className="audience-row">
          <AudienceDropdown
            label={copy.fields.audience}
            options={audienceOptions}
            value={audience}
            onChange={setAudience}
          />
        </div>
        <StyleControls value={style} onChange={setStyle} locale={locale} />
        <div className="button-grid">
          <button
            className="primary-button"
            onClick={() => void runCheck()}
            disabled={interactionBusy || workingText.trim().length < 3 || draftTooLong}
            type="button"
          >
            {status === 'analyzing' ? copy.buttons.checking : copy.buttons.check}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runRewrite()}
            disabled={interactionBusy || !workingText.trim() || draftTooLong}
            type="button"
          >
            {status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
          </button>
        </div>

          </div>
          {analysis ? <ReviewPanel model={model} placement="mobile" /> : null}
          <div className="refine-panel">
        <div className="voice-row">
          <label className="field grow">
            <span>{copy.fields.voice}</span>
            <textarea
              className="control compact-textarea"
              value={voiceCommand}
              onChange={(event) => setVoiceCommand(event.target.value)}
              placeholder={copy.placeholders.voice}
              rows={2}
            />
          </label>

          <div className="voice-actions">
            <button
              className="secondary-button icon-button edit-button"
              onClick={() => void runRewrite()}
              disabled={interactionBusy || !workingText.trim() || draftTooLong}
              type="button"
              title={status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
              aria-label={status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
            >
              <RewriteIcon />
            </button>

            <button
              className="ghost-button icon-button mic-button"
              onPointerDown={(event) => {
                void startVoiceCapture(event)
              }}
              onPointerUp={() => {
                requestVoiceStop()
              }}
              onPointerCancel={cancelVoiceCapture}
              onContextMenu={(event) => {
                event.preventDefault()
              }}
              disabled={!voiceSupported || (status !== 'idle' && !isRecording) || isStarting || isTranscribing || draftDictation.isRecording || draftDictation.isStarting || draftDictation.isTranscribing}
              type="button"
              title={isRecording || isTranscribing ? copy.buttons.stopMic : copy.buttons.mic}
              aria-label={isRecording || isTranscribing ? copy.buttons.stopMic : copy.buttons.mic}
              aria-pressed={isRecording}
            >
              {isTranscribing ? <span className="voice-spinner" aria-hidden="true" /> : isRecording ? <StopGlyph /> : <MicIcon />}
            </button>
          </div>
        </div>
        {isRecording || isStarting || isTranscribing ? (
          <div className="voice-status" aria-live="polite">
            <span className="voice-status-label">
              {isTranscribing ? copy.status.transcribing : copy.status.listening}
            </span>
            {isRecording ? (
              <div className="voice-level-wrap" aria-hidden="true">
                <div className="voice-level-bar" style={{ width: `${Math.max(6, Math.min(100, Math.round(level * 100)))}%` }} />
              </div>
            ) : null}
          </div>
        ) : null}

          </div>
          {error || recorderError || draftDictation.error ? <div className="error-banner" role="alert">{error || recorderError || draftDictation.error}</div> : null}
        </section>

        {<ReviewPanel model={model} placement="desktop" />}
      </div>

      <footer className="site-footer"><span>{copy.hero.eyebrow}</span><span>{copy.hero.subtitle}</span></footer>
    </main>
  )
}
