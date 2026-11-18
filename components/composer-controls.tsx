'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Audience } from '@/lib/assistant-contracts'

type HighlightTone = 'yellow' | 'red' | 'green'

export type HighlightSpan = {
  text: string
  tone: HighlightTone
  label: string
}

export type EditorSelection = {
  start: number
  end: number
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function findHighlightIndex(text: string, needle: string, fromIndex: number) {
  const exactIndex = text.indexOf(needle, fromIndex)
  if (exactIndex >= 0) {
    return exactIndex
  }

  return text.toLowerCase().indexOf(needle.toLowerCase(), fromIndex)
}

function buildHighlightSegments(text: string, highlights: HighlightSpan[]) {
  const accepted: Array<{ start: number; end: number; highlight: HighlightSpan }> = []
  let searchFrom = 0

  for (const highlight of highlights) {
    const needle = highlight.text.trim()
    if (!needle) {
      continue
    }

    let start = findHighlightIndex(text, needle, searchFrom)
    if (start < 0) {
      start = findHighlightIndex(text, needle, 0)
    }
    if (start < 0) {
      continue
    }

    const end = start + needle.length
    const overlapsExisting = accepted.some((segment) => start < segment.end && end > segment.start)
    if (overlapsExisting) {
      continue
    }

    accepted.push({ start, end, highlight })
    searchFrom = end
  }

  accepted.sort((left, right) => left.start - right.start)

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

function renderEditorHtml(text: string, highlights: HighlightSpan[], layer: 'analysis' | 'rewrite') {
  const segments = buildHighlightSegments(text, highlights)

  if (!segments.length) {
    return ''
  }

  return segments
    .map((segment) => {
      if (segment.kind === 'text') {
        return escapeHtml(segment.value)
      }

      return `<mark class="highlight-mark ${layer} ${segment.tone}" title="${escapeHtml(segment.label)}">${escapeHtml(segment.value)}</mark>`
    })
    .join('')
}

function normalizeEditorText(text: string) {
  return text.replace(/\r/g, '').replace(/\u00a0/g, ' ')
}

export function RewriteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M7 7h9l-2.5-2.5L15 3l5 5-5 5-1.5-1.5L16 9H7a3 3 0 0 0 0 6h2v2H7a5 5 0 0 1 0-10Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function UndoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M9 8V4L3 10l6 6v-4h4a4 4 0 1 1 0 8h-1v2h1a6 6 0 1 0 0-12H9Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function RedoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M15 8V4l6 6-6 6v-4h-4a4 4 0 1 0 0 8h1v2h-1a6 6 0 1 1 0-12h4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M9 3a2 2 0 0 0-2 2v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2h1a2 2 0 0 0 2-2V7l-4-4H9Zm8 4h-3V4.5L17 7ZM6 9h8v10H6V9Zm3-4h3v2H9V5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function PasteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M9 2h6a2 2 0 0 1 2 2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2-2Zm6 4V4H9v2h6Zm4 2H5v12h14V8Zm-9 3h6v2h-6v-2Zm0 4h6v2h-6v-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="m9.2 16.2-3.4-3.4L4.4 14.2l4.8 4.8L20 8.2l-1.4-1.4-9.4 9.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm-5-3H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2a5 5 0 1 1-10 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function StopGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  )
}

export function DraftEditor({
  value,
  analysisHighlights,
  rewriteHighlights,
  placeholder,
  selectionRef,
  onChange,
}: {
  value: string
  analysisHighlights: HighlightSpan[]
  rewriteHighlights: HighlightSpan[]
  placeholder: string
  selectionRef: { current: EditorSelection | null }
  onChange: (value: string) => void
}) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const analysisOverlayRef = useRef<HTMLDivElement | null>(null)
  const rewriteOverlayRef = useRef<HTMLDivElement | null>(null)
  const analysisHtml = useMemo(() => renderEditorHtml(value, analysisHighlights, 'analysis'), [analysisHighlights, value])
  const rewriteHtml = useMemo(() => renderEditorHtml(value, rewriteHighlights, 'rewrite'), [rewriteHighlights, value])

  useLayoutEffect(() => {
    const editor = editorRef.current
    const analysisOverlay = analysisOverlayRef.current
    const rewriteOverlay = rewriteOverlayRef.current
    if (!editor || !analysisOverlay || !rewriteOverlay) {
      return
    }

    analysisOverlay.scrollTop = editor.scrollTop
    rewriteOverlay.scrollTop = editor.scrollTop

    if (selectionRef.current) {
      const nextSelection = selectionRef.current
      try {
        editor.setSelectionRange(nextSelection.start, nextSelection.end)
      } catch {
        // ignore selection restore issues on mobile/browser edge cases
      }
      selectionRef.current = null
    }
  }, [analysisHtml, rewriteHtml, selectionRef, value])

  return (
    <div className="editor-layer">
      <div
        ref={analysisOverlayRef}
        className="editor-overlay analysis-layer"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: analysisHtml }}
      />
      <div
        ref={rewriteOverlayRef}
        className="editor-overlay rewrite-layer"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: rewriteHtml }}
      />
      <textarea
        ref={editorRef}
        id="main-draft"
        className="text-input draft-input editor-textarea"
        value={value}
        onChange={(event) => onChange(normalizeEditorText(event.currentTarget.value))}
        onScroll={(event) => {
          if (analysisOverlayRef.current) {
            analysisOverlayRef.current.scrollTop = event.currentTarget.scrollTop
          }
          if (rewriteOverlayRef.current) {
            rewriteOverlayRef.current.scrollTop = event.currentTarget.scrollTop
          }
        }}
        placeholder={placeholder}
        spellCheck
      />
    </div>
  )
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="icon-glyph">
      <path d="M5.5 7.5 10 12l4.5-4.5 1.4 1.4L10 14.8 4.1 8.9z" fill="currentColor" />
    </svg>
  )
}

export function AudienceDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: Audience; label: string; helper: string }>
  value: Audience
  onChange: (value: Audience) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const current = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) {
      return
    }

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="audience-picker">
      <span>{label}</span>
      <button
        className="control audience-button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="audience-button-copy">
          <span className="audience-button-label">{current.label}</span>
          <span className="audience-button-helper">{current.helper}</span>
        </span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <div className="audience-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              className={`audience-option ${option.value === value ? 'selected' : ''}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              <span className="audience-option-label">{option.label}</span>
              <span className="audience-option-helper">{option.helper}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

