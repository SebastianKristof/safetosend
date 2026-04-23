'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type RecorderState = {
  isRecording: boolean
  isStarting: boolean
  level: number
  error: string | null
  mimeType: string | null
}

function pickMimeType(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const recorder = window.MediaRecorder
  if (!recorder) {
    return null
  }

  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
  for (const type of candidates) {
    if (recorder.isTypeSupported(type)) {
      return type
    }
  }

  return ''
}

export function useAudioRecorder() {
  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return Boolean(navigator.mediaDevices && window.MediaRecorder)
  }, [])

  const mimeType = useMemo(() => pickMimeType(), [])

  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isStarting: false,
    level: 0,
    error: null,
    mimeType,
  })

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const levelRafRef = useRef<number | null>(null)
  const stopRequestedRef = useRef(false)
  const startTimeRef = useRef<number | null>(null)
  const startTimeoutRef = useRef<number | null>(null)
  const isRecordingRef = useRef(false)

  const stopLevelTracking = useCallback(() => {
    if (levelRafRef.current) {
      window.cancelAnimationFrame(levelRafRef.current)
      levelRafRef.current = null
    }

    analyserRef.current = null
    const context = audioContextRef.current
    if (context) {
      void context.close().catch(() => {})
      audioContextRef.current = null
    }

    setState((prev) => (prev.level !== 0 ? { ...prev, level: 0 } : prev))
  }, [])

  const startLevelTracking = useCallback((stream: MediaStream) => {
    if (typeof window === 'undefined') {
      return
    }

    const AudioContextCtor =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      return
    }

    const context = new AudioContextCtor()
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.85

    const source = context.createMediaStreamSource(stream)
    source.connect(analyser)

    const buffer = new Uint8Array(analyser.fftSize)
    audioContextRef.current = context
    analyserRef.current = analyser

    const tick = () => {
      const currentAnalyser = analyserRef.current
      if (!currentAnalyser) {
        return
      }

      currentAnalyser.getByteTimeDomainData(buffer)
      let sumSquares = 0
      for (let index = 0; index < buffer.length; index += 1) {
        const normalized = (buffer[index] - 128) / 128
        sumSquares += normalized * normalized
      }

      const rms = Math.sqrt(sumSquares / buffer.length)
      const nextLevel = Math.min(1, Math.max(0, rms * 3.2))
      setState((prev) => {
        if (Math.abs(prev.level - nextLevel) < 0.01) {
          return prev
        }

        return { ...prev, level: nextLevel }
      })

      levelRafRef.current = window.requestAnimationFrame(tick)
    }

    levelRafRef.current = window.requestAnimationFrame(tick)
  }, [])

  const stopTracks = useCallback(() => {
    stopLevelTracking()
    const stream = streamRef.current
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop()
      }
    }
    streamRef.current = null
  }, [stopLevelTracking])

  const start = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null, isStarting: true }))

    if (!isSupported) {
      setState((prev) => ({
        ...prev,
        error: 'Audio recording is not supported in this browser.',
        isStarting: false,
      }))
      return
    }

    if (isRecordingRef.current) {
      return
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setState((prev) => ({
        ...prev,
        error: 'Microphone access requires HTTPS (or localhost).',
        isStarting: false,
      }))
      return
    }

    try {
      stopRequestedRef.current = false
      startTimeRef.current = Date.now()
      if (startTimeoutRef.current) {
        window.clearTimeout(startTimeoutRef.current)
        startTimeoutRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      startLevelTracking(stream)

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stopTracks()
        setState((prev) => ({
          ...prev,
          error: 'No audio input device was found.',
          isStarting: false,
        }))
        return
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstart = () => {
        if (startTimeoutRef.current) {
          window.clearTimeout(startTimeoutRef.current)
          startTimeoutRef.current = null
        }

        isRecordingRef.current = true
        setState((prev) => ({ ...prev, isRecording: true, isStarting: false }))
      }

      recorder.onerror = (event) => {
        const err = (event as unknown as { error?: { name?: string; message?: string } }).error
        setState((prev) => ({ ...prev, error: err?.message || err?.name || 'Recorder error.' }))
      }

      recorder.onstop = () => {
        const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : null
        const stoppedWithoutData = chunksRef.current.length === 0
        isRecordingRef.current = false

        if (startTimeoutRef.current) {
          window.clearTimeout(startTimeoutRef.current)
          startTimeoutRef.current = null
        }

        if (
          !stopRequestedRef.current &&
          (stoppedWithoutData || (elapsedMs !== null && elapsedMs < 900))
        ) {
          const base =
            elapsedMs !== null && elapsedMs < 900
              ? 'Recording ended immediately. Check microphone permission.'
              : 'Recording stopped unexpectedly.'

          setState((prev) => ({
            ...prev,
            isRecording: false,
            isStarting: false,
            error: prev.error || base,
          }))
        } else {
          setState((prev) => ({ ...prev, isRecording: false, isStarting: false }))
        }

        stopTracks()
      }

      recorder.start()
      startTimeoutRef.current = window.setTimeout(() => {
        const currentRecorder = recorderRef.current
        if (currentRecorder && currentRecorder.state !== 'recording') {
          setState((prev) => ({
            ...prev,
            isRecording: false,
            isStarting: false,
            error: prev.error || 'Microphone did not start recording.',
          }))
        }
      }, 800)
    } catch (error) {
      stopTracks()
      const name =
        error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name) : ''
      const rawMessage = error instanceof Error ? error.message : String(error)
      const message = (() => {
        if (name === 'NotAllowedError') return 'Microphone permission denied.'
        if (name === 'NotFoundError') return 'No microphone found on this device.'
        if (name === 'NotReadableError') return 'Microphone is in use by another app.'
        if (name === 'NotSupportedError') return 'Recording is not supported by this browser.'
        if (name === 'AbortError') return 'Microphone request was aborted.'
        if (name === 'OverconstrainedError') return 'No microphone matches the requested constraints.'
        if (name === 'SecurityError') return 'Microphone access blocked by browser security policy.'
        return rawMessage || 'Recording failed to start.'
      })()
      setState((prev) => ({ ...prev, error: message, isStarting: false }))
    }
  }, [isSupported, mimeType, startLevelTracking, stopTracks])

  const stop = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current || !isRecordingRef.current) {
      return null
    }

    const recorder = recorderRef.current
    return await new Promise<Blob | null>((resolve) => {
      const handleStop = () => {
        recorder.removeEventListener('stop', handleStop)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        resolve(blob)
      }

      recorder.addEventListener('stop', handleStop)
      stopRequestedRef.current = true
      try {
        recorder.stop()
      } catch {
        resolve(null)
      }
    })
  }, [])

  const abort = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && isRecordingRef.current) {
      try {
        stopRequestedRef.current = true
        recorder.stop()
      } catch {
        // ignore
      }
    }

    if (startTimeoutRef.current) {
      window.clearTimeout(startTimeoutRef.current)
      startTimeoutRef.current = null
    }

    recorderRef.current = null
    chunksRef.current = []
    isRecordingRef.current = false
    setState((prev) => ({ ...prev, isRecording: false, isStarting: false }))
    stopTracks()
  }, [stopTracks])

  useEffect(() => () => abort(), [abort])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    isSupported,
    isRecording: state.isRecording,
    isStarting: state.isStarting,
    level: state.level,
    error: state.error,
    mimeType: state.mimeType,
    start,
    stop,
    abort,
    clearError,
  }
}
