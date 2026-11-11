'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { encodeMonoWav } from '../lib/audio-format'

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

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg',
  ]
  for (const type of candidates) {
    if (recorder.isTypeSupported(type)) {
      return type
    }
  }

  return ''
}

export function useAudioRecorder() {
  // Detect after hydration, not while Next.js renders the page on the server.
  // Web Audio is a fallback when MediaRecorder is unavailable or disabled.
  const [isSupported, setIsSupported] = useState(false)
  const [mimeType, setMimeType] = useState<string | null>(null)
  useEffect(() => {
    const audioContextAvailable = Boolean(window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    setIsSupported(Boolean(navigator.mediaDevices?.getUserMedia && (window.MediaRecorder || audioContextAvailable)))
    setMimeType(pickMimeType())
  }, [])

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
  const isStartingRef = useRef(false)
  const captureGenerationRef = useRef(0)
  const rawContextRef = useRef<AudioContext | null>(null)
  const rawWorkletRef = useRef<AudioWorkletNode | null>(null)
  const rawScriptRef = useRef<ScriptProcessorNode | null>(null)
  const rawChunksRef = useRef<Float32Array[]>([])
  const rawSampleRateRef = useRef(16_000)
  const flushResolverRef = useRef<(() => void) | null>(null)

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
    if (isStartingRef.current || isRecordingRef.current) return
    isStartingRef.current = true
    const captureGeneration = ++captureGenerationRef.current
    setState((prev) => ({ ...prev, error: null, isStarting: true }))

    if (!isSupported) {
      isStartingRef.current = false
      setState((prev) => ({
        ...prev,
        error: 'Audio recording is not supported in this browser.',
        isStarting: false,
      }))
      return
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      isStartingRef.current = false
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

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: { ideal: 1 }, echoCancellation: true, noiseSuppression: true },
      })
      if (captureGenerationRef.current !== captureGeneration) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      chunksRef.current = []

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

      let recorder: MediaRecorder | null = null
      if (window.MediaRecorder) {
        try {
          // Speech does not need music-quality bitrates. Opus ~32 kbps is
          // typically around 180 KB for a full 45-second dictation.
          recorder = new MediaRecorder(stream, mimeType
            ? { mimeType, audioBitsPerSecond: 32_000 }
            : { audioBitsPerSecond: 32_000 })
        } catch {
          // Some browsers expose MediaRecorder but cannot start it.
          // Fall through to Web Audio PCM capture.
        }
      }

      if (!recorder) {
        stopLevelTracking()
        const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextCtor) throw new Error('This browser cannot record audio. Use a recent browser and allow microphone access.')
        const context = new AudioContextCtor()
        rawContextRef.current = context
        rawSampleRateRef.current = context.sampleRate
        rawChunksRef.current = []
        const source = context.createMediaStreamSource(stream)
        const silentSink = context.createGain()
        silentSink.gain.value = 0

        const saveSamples = (samples: Float32Array) => {
          rawChunksRef.current.push(samples)
          let sum = 0
          for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index]
          const level = Math.min(1, Math.sqrt(sum / samples.length) * 3.2)
          setState((previous) => Math.abs(previous.level - level) < 0.015 ? previous : { ...previous, level })
        }

        if (context.audioWorklet && window.AudioWorkletNode) {
          await context.audioWorklet.addModule('/audio-capture-worklet.js')
          const node = new AudioWorkletNode(context, 'safetosend-audio-capture')
          rawWorkletRef.current = node
          node.port.onmessage = (event: MessageEvent<{ type: string; samples?: Float32Array }>) => {
            if (event.data.type === 'samples' && event.data.samples?.length) saveSamples(event.data.samples)
            if (event.data.type === 'flushed') flushResolverRef.current?.()
          }
          source.connect(node)
          node.connect(silentSink)
        } else {
          // Legacy compatibility only; AudioWorklet is preferred.
          const processor = context.createScriptProcessor(4096, 1, 1)
          rawScriptRef.current = processor
          processor.onaudioprocess = (event) => {
            const samples = event.inputBuffer.getChannelData(0)
            saveSamples(new Float32Array(samples))
            event.outputBuffer.getChannelData(0).fill(0)
          }
          source.connect(processor)
          processor.connect(silentSink)
        }
        silentSink.connect(context.destination)
        await context.resume()
        if (captureGenerationRef.current !== captureGeneration) return
        isStartingRef.current = false
        isRecordingRef.current = true
        setState((prev) => ({ ...prev, isRecording: true, isStarting: false, error: null }))
        return
      }

      startLevelTracking(stream)
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
        isStartingRef.current = false
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
      isStartingRef.current = false
      stopTracks()
      if (rawContextRef.current) {
        void rawContextRef.current.close().catch(() => {})
        rawContextRef.current = null
      }
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
  }, [isSupported, mimeType, startLevelTracking, stopLevelTracking, stopTracks])

  const stop = useCallback(async (): Promise<Blob | null> => {
    if (!isRecordingRef.current) return null

    if (rawContextRef.current) {
      // Flush any partially filled worklet buffer before encoding.
      const context = rawContextRef.current
      const node = rawWorkletRef.current
      if (node) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 250)
          flushResolverRef.current = () => {
            window.clearTimeout(timer)
            resolve()
          }
          node.port.postMessage('flush')
        })
      }
      flushResolverRef.current = null
      const blob = encodeMonoWav(rawChunksRef.current, rawSampleRateRef.current)
      rawChunksRef.current = []
      rawWorkletRef.current?.disconnect()
      rawScriptRef.current?.disconnect()
      rawWorkletRef.current = null
      rawScriptRef.current = null
      rawContextRef.current = null
      await context.close().catch(() => {})
      isRecordingRef.current = false
      setState((prev) => ({ ...prev, isRecording: false, isStarting: false, level: 0 }))
      stopTracks()
      return blob
    }

    if (!recorderRef.current) return null
    const recorder = recorderRef.current
    return await new Promise<Blob | null>((resolve) => {
      const handleStop = () => {
        recorder.removeEventListener('stop', handleStop)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        recorderRef.current = null
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
  }, [mimeType, stopTracks])

  const abort = useCallback(() => {
    captureGenerationRef.current += 1
    isStartingRef.current = false
    const context = rawContextRef.current
    rawContextRef.current = null
    rawWorkletRef.current?.disconnect()
    rawScriptRef.current?.disconnect()
    rawWorkletRef.current = null
    rawScriptRef.current = null
    rawChunksRef.current = []
    if (context) void context.close().catch(() => {})
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
