'use client'
import type { useComposer } from '@/hooks/use-composer'

export function ReviewPanel({ model, placement }: { model: ReturnType<typeof useComposer>; placement: 'mobile' | 'desktop' }) {
  const { analysis, draftIsStale, copy, styleCopy, verdictTone, verdictLabel, analysisHighlightReasons, localizedMeaning, locale, mobileReviewRef, workingText } = model
  return (
    <aside className={`insight-column ${placement}-review`} ref={placement === 'mobile' ? mobileReviewRef : undefined}>
          <section className="panel insights-panel">
            <div className="section-head">
              <span className="step-number">02</span>
              <div className="section-heading"><span className="section-title">{copy.workspace.review}</span><span className="section-subtitle">{copy.workspace.reviewHint}</span></div>
            </div>
        <section className="analysis-card" aria-live="polite">
          <div className="analysis-topline">
            <span className={`verdict-pill ${verdictTone}`}>{verdictLabel}</span>
          </div>
          <p className="analysis-meta">
            {analysis && !draftIsStale
            ? `${copy.analysis.likelyIntent}: ${analysis.inferredGoal} · ${copy.analysis.tone}: ${analysis.recommendedTone}`
            : copy.analysis.resultsPlaceholder}
          </p>
          {draftIsStale ? <p className="reason-text">{styleCopy.recheck}</p> : null}
          {analysis && !draftIsStale ? (
            <div className="analysis-reasons">
              <p className="analysis-reasons-label">{copy.panel.reasons}</p>
              <p className="reason-text">{analysis.reason}</p>
              {analysisHighlightReasons.length ? (
                <ul className="reason-notes">
                  {analysisHighlightReasons.map((item, index) => (
                    <li key={`${item.tone}-${item.reason}-${index}`} className={`reason-note ${item.tone}`}>
                      {item.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
        {analysis && !draftIsStale && analysis.languageFixes?.length ? (
          <section className="language-fixes">
            <p className="verification-card-title">{styleCopy.language}</p>
            <ul>{analysis.languageFixes.map((fix, index) => <li key={index}>
              <p><del lang="en">{fix.text}</del> → <ins lang="en">{fix.replacement}</ins></p>
              <p>{fix.reason}</p>
            </li>)}</ul>
          </section>
        ) : null}
        {analysis && !draftIsStale && analysis.verdict === 'Safe to send' && !analysis.highlights.length && !analysis.languageFixes?.length && analysis.suggestedText === workingText.trim() ? <p className="no-changes">{styleCopy.noChanges}</p> : null}
        {localizedMeaning ? (
          <section className="verification-card" aria-labelledby={`verification-meaning-title-${placement}`}>
            <div className="verification-card-head">
              <p className="verification-card-title" id={`verification-meaning-title-${placement}`}>
                {copy.analysis.translationTitle}
              </p>
              <p className="verification-card-note">{copy.analysis.translationNote}</p>
            </div>
            <p className="verification-meaning" lang={locale}>
              {localizedMeaning}
            </p>
          </section>
        ) : null}

          </section>
        </aside>
  
  )
}
