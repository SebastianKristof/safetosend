'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioRecorder } from './use-audio-recorder'

type TimedDictationOptions = {
  maxSeconds: number
  transcribe: (blob: Blob) => Promise<string>
  onTranscript: (text: string) => void
}

/**
 * Tap-to-record dictation for the main draft.
 * Unlike the existing press-and-hold voice commands, this records until
 * the user taps Stop or the time limit is reached.
 */
export function useTimedDictation({ maxSeconds, transcribe, onTranscript }: TimedDictationOptions) {
  const recorder = useAudioRecorder()
  const [remainingSeconds, setRemainingSeconds] = useState(maxSeconds)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const stoppingRef = useRef(false)
  const transcribeRef = useRef(transcribe)
  const onTranscriptRef = useRef(onTranscript)

  // Keep the async completion handler current even if the user edits while
  // transcription is in flight.
  transcribeRef.current = transcribe
  onTranscriptRef.current = onTranscript

  const stop = useCallback(async () => {
    if (stoppingRef.current) return
    stoppingRef.current = true

    try {
      const blob = await recorder.stop()
      if (!blob) {
        setTranscriptionError('Could not finish the recording.')
        return
      }
      if (blob.size < 1200) {
        setTranscriptionError('Recording is too short. Try speaking a little longer.')
        return
      }

      setIsTranscribing(true)
      const text = await transcribeRef.current(blob)
      onTranscriptRef.current(text)
      setTranscriptionError(null)
    } catch (error) {
      setTranscriptionError(error instanceof Error ? error.message : 'Transcription failed.')
    } finally {
      setRemainingSeconds(maxSeconds)
      setIsTranscribing(false)
      stoppingRef.current = false
    }
  }, [maxSeconds, recorder.stop])

  const start = useCallback(async () => {
    if (recorder.isRecording || recorder.isStarting || isTranscribing || stoppingRef.current) return
    setTranscriptionError(null)
    setRemainingSeconds(maxSeconds)
    recorder.clearError()
    await recorder.start()
  }, [isTranscribing, maxSeconds, recorder.clearError, recorder.isRecording, recorder.isStarting, recorder.start])

  useEffect(() => {
    if (!recorder.isRecording) return

    // Begin the clock when MediaRecorder actually starts, not when the
    // browser first asks for microphone permission.
    const startedAt = performance.now()
    const updateCountdown = () => {
      const elapsedMs = performance.now() - startedAt
      setRemainingSeconds(Math.max(0, maxSeconds - Math.floor(elapsedMs / 1000)))
    }
    const interval = window.setInterval(updateCountdown, 250)
    const limit = window.setTimeout(() => void stop(), maxSeconds * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(limit)
    }
  }, [maxSeconds, recorder.isRecording, stop])

  return {
    isSupported: recorder.isSupported,
    isRecording: recorder.isRecording,
    isStarting: recorder.isStarting,
    isTranscribing,
    remainingSeconds,
    level: recorder.level,
    error: transcriptionError || recorder.error,
    start,
    stop,
  }
}
