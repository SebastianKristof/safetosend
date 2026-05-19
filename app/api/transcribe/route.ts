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

function getVoiceProvider(): 'openai' | 'openrouter' | 'vercel' {
  return (
    process.env.SAFETOSEND_VOICE_PROVIDER?.trim() ||
    process.env.SAFETOSEND_VOICE_MODEL_PROVIDER?.trim() ||
    DEFAULT_TRANSCRIBE_MODEL_PROVIDER
  ) as 'openai' | 'openrouter' | 'vercel'
}

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return null
  }
  return apiKey
}

function createOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return null
  }
  return apiKey
}

function createClient() {
  const provider = getVoiceProvider()

  if (provider === 'openai') {
    return createOpenAIClient()
  } else if (provider === 'openrouter') {
    return createOpenRouterClient()
  } else {
    // Vercel doesn't need a client key for transcription in this implementation
    return true
  }
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

async function transcribeWithOpenAI(apiKey: string, file: File, model: string): Promise<{ text?: string }> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  // Using OpenAI's audio transcription API
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: `audio.${guessAudioFormat(file)}`,
      base64_audio: base64,
      model,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `OpenAI transcription failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ''}`,
    )
  }

  return (await response.json()) as { text?: string }
}

async function transcribeWithOpenRouter(apiKey: string, file: File, model: string): Promise<{ text?: string }> {
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

async function transcribeWithVercel(file: File): Promise<{ text?: string }> {
  // For Vercel, we'll use the AI SDK's transcription capabilities
  // But since we're in a route handler, we'll need to call the Vercel AI gateway
  // For now, we'll fall back to OpenAI if the key is available, otherwise show helpful error
  const openaiKey = process.env.OPENAI_API_KEY?.trim()
  if (openaiKey) {
    return transcribeWithOpenAI(openaiKey, file, 'whisper-1')
  }

  throw new Error('Vercel transcription requires OPENAI_API_KEY to be set as fallback')
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File)) {
      return Response.json({ error: 'Missing audio file.' }, { status: 400 })
    }

    const provider = getVoiceProvider()

    // Handle OpenAI provider
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY?.trim()
      if (!apiKey) {
        return Response.json(
          { error: 'Missing OPENAI_API_KEY environment variable for OpenAI transcription.' },
          { status: 500 },
        )
      }

      const model = splitModel(
        process.env.SAFETOSEND_VOICE_MODEL_NAME,
        DEFAULT_TRANSCRIBE_MODEL_PROVIDER,
        DEFAULT_TRANSCRIBE_MODEL_NAME,
      )
      const modelToUse = `${model.modelProvider}/${model.modelName}`

      try {
        const transcript = await transcribeWithOpenAI(apiKey, file, modelToUse)
        return Response.json({
          text: transcript.text || '',
          modelId: modelToUse,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return Response.json({ error: `Transcription failed: ${message}` }, { status: 500 })
      }
    }

    // Handle OpenRouter provider
    else if (provider === 'openrouter') {
      const apiKey = process.env.OPENROUTER_API_KEY?.trim()
      if (!apiKey) {
        return Response.json(
          { error: 'Missing OPENROUTER_API_KEY environment variable.' },
          { status: 500 },
        )
      }

      const model = splitModel(
        process.env.SAFETOSEND_VOICE_MODEL_NAME,
        DEFAULT_TRANSCRIBE_MODEL_PROVIDER,
        DEFAULT_TRANSCRIBE_MODEL_NAME,
      )
      const modelToUse = `${model.modelProvider}/${model.modelName}`

      try {
        const transcript = await transcribeWithOpenRouter(apiKey, file, modelToUse)
        return Response.json({
          text: transcript.text || '',
          modelId: modelToUse,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return Response.json({ error: `Transcription failed: ${message}` }, { status: 500 })
      }
    }

    // Handle Vercel provider
    else {
      // Vercel provider - try to use available keys
      const openaiKey = process.env.OPENAI_API_KEY?.trim()
      if (openaiKey) {
        try {
          const transcript = await transcribeWithOpenAI(openaiKey, file, 'whisper-1')
          return Response.json({
            text: transcript.text || '',
            modelId: 'openai/whisper-1',
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return Response.json({ error: `Transcription failed: ${message}` }, { status: 500 })
        }
      }

      const openrouterKey = process.env.OPENROUTER_API_KEY?.trim()
      if (openrouterKey) {
        try {
          const transcript = await transcribeWithOpenRouter(openrouterKey, file, 'whisper-1')
          return Response.json({
            text: transcript.text || '',
            modelId: 'openrouter/whisper-1',
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return Response.json({ error: `Transcription failed: ${message}` }, { status: 500 })
        }
      }

      return Response.json(
        { error: 'Missing API key for transcription. Please set OPENAI_API_KEY or OPENROUTER_API_KEY.' },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[transcribe] error:', message)
    return Response.json({ error: `Transcription failed: ${message}` }, { status: 500 })
  }
}
