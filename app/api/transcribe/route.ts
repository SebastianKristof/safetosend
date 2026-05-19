export const maxDuration = 60

const DEFAULT_TRANSCRIBE_MODEL_PROVIDER = 'openai'
const DEFAULT_TRANSCRIBE_MODEL_NAME = 'gpt-4o-mini-transcribe'
const FALLBACK_TRANSCRIBE_MODEL_PROVIDER = 'openai'
const FALLBACK_TRANSCRIBE_MODEL_NAME = 'whisper-1'

function splitModel(value: string | undefined, fallbackProvider: string, fallbackName: string) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return {
      modelProvider: fallbackProvider,
      modelName: fallbackName,
    }
  }

  const slashIndex = trimmed.indexOf('/')
  if (slashIndex === -1) {
    return {
      modelProvider: fallbackProvider,
      modelName: trimmed,
    }
  }

  return {
    modelProvider: trimmed.slice(0, slashIndex).trim() || fallbackProvider,
    modelName: trimmed.slice(slashIndex + 1).trim() || fallbackName,
  }
}

function createClient() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return null
  }

  return apiKey
}

function guessAudioFormat(file: File) {
  const type = file.type.toLowerCase()

  if (type.includes('webm')) return 'webm'
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3'
  if (type.includes('mp4') || type.includes('m4a')) return 'mp4'
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('wav')) return 'wav'
  if (type.includes('aac')) return 'aac'

  return 'webm'
}

async function transcribeWithOpenRouter(apiKey: string, file: File, model: string) {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input_audio: {
        data: base64,
        format: guessAudioFormat(file),
      },
      model,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `OpenRouter transcription failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ''}`,
    )
  }

  return (await response.json()) as { text?: string }
}

export async function POST(request: Request) {
  const client = createClient()
  if (!client) {
    return Response.json(
      { error: 'Missing OPENROUTER_API_KEY environment variable.' },
      { status: 500 },
    )
  }

  try {
    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File)) {
      return Response.json({ error: 'Missing audio file.' }, { status: 400 })
    }

    const preferred = splitModel(
      process.env.SAFETOSEND_VOICE_MODEL_NAME,
      DEFAULT_TRANSCRIBE_MODEL_PROVIDER,
      DEFAULT_TRANSCRIBE_MODEL_NAME,
    )
    const preferredName = process.env.SAFETOSEND_VOICE_MODEL_NAME?.trim()
    const preferredProvider = process.env.SAFETOSEND_VOICE_MODEL_PROVIDER?.trim() || preferred.modelProvider
    const legacy = splitModel(
      process.env.SAFETOSEND_VOICE_MODEL,
      DEFAULT_TRANSCRIBE_MODEL_PROVIDER,
      DEFAULT_TRANSCRIBE_MODEL_NAME,
    )
    const candidates = Array.from(
      new Set([
        `${preferredProvider}/${preferredName || preferred.modelName}`,
        `${legacy.modelProvider}/${legacy.modelName}`,
        `${DEFAULT_TRANSCRIBE_MODEL_PROVIDER}/${DEFAULT_TRANSCRIBE_MODEL_NAME}`,
        `${FALLBACK_TRANSCRIBE_MODEL_PROVIDER}/${FALLBACK_TRANSCRIBE_MODEL_NAME}`,
      ]),
    )

    let lastError = 'Transcription failed.'
    for (const model of candidates) {
      try {
        const transcript = await transcribeWithOpenRouter(client, file, model)

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
