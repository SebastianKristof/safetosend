import OpenAI from 'openai'

export const maxDuration = 60

const DEFAULT_TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe'
const FALLBACK_TRANSCRIBE_MODEL = 'whisper-1'

function normalizeModelName(value: string | undefined) {
  const trimmed = value?.trim() || DEFAULT_TRANSCRIBE_MODEL
  return trimmed.replace(/^[^/]+\//, '')
}

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return null
  }

  return new OpenAI({ apiKey })
}

export async function POST(request: Request) {
  const client = createClient()
  if (!client) {
    return Response.json({ error: 'Missing OPENAI_API_KEY environment variable.' }, { status: 500 })
  }

  try {
    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File)) {
      return Response.json({ error: 'Missing audio file.' }, { status: 400 })
    }

    const preferred = normalizeModelName(process.env.SAFETOSEND_VOICE_MODEL_NAME)
    const legacy = normalizeModelName(process.env.SAFETOSEND_VOICE_MODEL)
    const candidates = Array.from(
      new Set([preferred, legacy, DEFAULT_TRANSCRIBE_MODEL, FALLBACK_TRANSCRIBE_MODEL]),
    ).filter((value): value is string => Boolean(value))

    let lastError = 'Transcription failed.'
    for (const model of candidates) {
      try {
        const transcript = await client.audio.transcriptions.create({
          file,
          model,
        })

        return Response.json({
          text: transcript.text || '',
          modelId: model,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        lastError = message
        const modelError = /could not be resolved|model not found|unknown model|no such model/i.test(
          message,
        )
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
