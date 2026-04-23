export const maxDuration = 60

const DEFAULT_TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe'
const FALLBACK_TRANSCRIBE_MODEL = 'whisper-1'
const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions'

function normalizeModelName(value: string | undefined) {
  const trimmed = value?.trim() || DEFAULT_TRANSCRIBE_MODEL
  return trimmed.replace(/^[^/]+\//, '')
}

export async function POST(request: Request) {
  const openaiKey = process.env.OPENAI_API_KEY?.trim()
  if (!openaiKey) {
    return Response.json({ error: 'Missing OPENAI_API_KEY environment variable.' }, { status: 500 })
  }

  try {
    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File)) {
      return Response.json({ error: 'Missing audio file.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const preferred = normalizeModelName(process.env.SAFETOSEND_VOICE_MODEL_NAME)
    const legacy = normalizeModelName(process.env.SAFETOSEND_VOICE_MODEL)
    const candidates = Array.from(
      new Set([preferred, legacy, DEFAULT_TRANSCRIBE_MODEL, FALLBACK_TRANSCRIBE_MODEL]),
    ).filter((value): value is string => Boolean(value))

    let lastError = 'Transcription failed.'
    for (const model of candidates) {
      try {
        const openaiForm = new FormData()
        const contentType = file.type || 'audio/webm'
        const ext = file.name?.split('.').pop() || (contentType.includes('ogg') ? 'ogg' : 'webm')
        openaiForm.append('file', new File([arrayBuffer], `audio.${ext}`, { type: contentType }))
        openaiForm.append('model', model)

        const response = await fetch(OPENAI_TRANSCRIBE_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: openaiForm,
          signal: request.signal,
        })

        const json = (await response.json().catch(() => ({}))) as {
          text?: string
          error?: { message?: string }
        }

        if (!response.ok) {
          const message = json.error?.message || `OpenAI transcription failed (HTTP ${response.status}).`
          throw new Error(message)
        }

        return Response.json({
          text: json.text || '',
          modelId: model,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        lastError = message
        const modelError = /could not be resolved|model not found|unknown model|no such model/i.test(message)
        if (!modelError) {
          console.error('[transcribe] error:', message)
          break
        }

        console.warn('[transcribe] model unavailable:', model, message)
      }
    }

    return Response.json({ error: `Transcription failed: ${lastError}` }, { status: 500 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[transcribe] error:', message)
    return Response.json({ error: `Transcription failed: ${message}` }, { status: 500 })
  }
}
