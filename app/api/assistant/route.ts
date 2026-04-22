import { generateText, Output } from 'ai'
import { NextResponse } from 'next/server'
import {
  analysisResponseSchema,
  assistantRequestSchema,
  transformResponseSchema,
} from '@/lib/assistant-contracts'
import { getInferenceConfig, resolveInferenceModel } from '@/lib/inference-config'
import {
  buildAnalysisPrompt,
  buildEditPrompt,
  getPromptBundle,
} from '@/lib/assistant-prompts'
import type { InferenceProvider } from '@/lib/inference-config'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = assistantRequestSchema.safeParse(body)

  if (!parsed.success) {
    const fieldErrors = Object.entries(parsed.error.flatten().fieldErrors)
      .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`))
      .join(' | ')

    return NextResponse.json(
      {
        error: 'Invalid request.',
        detail: fieldErrors || undefined,
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const payload = parsed.data
  const locale = payload.locale
  const inferenceConfig = getInferenceConfig()
  const prompts = await getPromptBundle()
  const messages = {
    en: {
      missingDraft: 'Missing draft text.',
      missingInstruction: 'Missing edit instruction.',
      requestFailed: 'AI request failed.',
    },
    ru: {
      missingDraft: 'Не хватает текста черновика.',
      missingInstruction: 'Не хватает инструкции для правки.',
      requestFailed: 'Запрос к ИИ не удался.',
    },
    es: {
      missingDraft: 'Falta el texto del borrador.',
      missingInstruction: 'Falta la instruccion de edicion.',
      requestFailed: 'La solicitud a la IA fallo.',
    },
    de: {
      missingDraft: 'Entwurfstext fehlt.',
      missingInstruction: 'Bearbeitungsanweisung fehlt.',
      requestFailed: 'Die KI-Anfrage ist fehlgeschlagen.',
    },
    fr: {
      missingDraft: 'Le texte du brouillon manque.',
      missingInstruction: "L'instruction de modification manque.",
      requestFailed: "La requete a l'IA a echoue.",
    },
  }[locale]

  const buildProviderOptions = (provider: InferenceProvider) =>
    provider === 'vercel'
      ? {
          gateway: {
            user: payload.clientId || 'anonymous',
            tags: ['app:safetosend', `mode:${payload.mode}`, `audience:${payload.audience}`],
          },
        }
      : undefined

  try {
    if (payload.mode === 'analyze') {
      if (payload.text.trim().length < 3) {
        return NextResponse.json({ error: messages.missingDraft }, { status: 400 })
      }

      const slot = inferenceConfig.textAnalysis
      const model = resolveInferenceModel(slot)

      const result = await generateText({
        model,
        system: prompts.analyzeSystem,
        prompt: buildAnalysisPrompt(payload, prompts.analyzeUser),
        output: Output.object({
          schema: analysisResponseSchema,
        }),
        temperature: 0.2,
        maxOutputTokens: 450,
        providerOptions: buildProviderOptions(slot.provider),
      })

      return NextResponse.json(result.output)
    }

    if (payload.text.trim().length < 3) {
      return NextResponse.json({ error: messages.missingDraft }, { status: 400 })
    }

    if (!payload.instruction?.trim()) {
      return NextResponse.json({ error: messages.missingInstruction }, { status: 400 })
    }

    const slot = inferenceConfig.textGeneration
    const model = resolveInferenceModel(slot)

    const result = await generateText({
      model,
      system: prompts.transformSystem,
      prompt: buildEditPrompt(payload, prompts.editUser),
      output: Output.object({
        schema: transformResponseSchema,
      }),
      temperature: 0.35,
      maxOutputTokens: 320,
      providerOptions: buildProviderOptions(slot.provider),
    })

    return NextResponse.json(result.output)
  } catch (error) {
    return NextResponse.json(
      {
        error: messages.requestFailed,
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 },
    )
  }
}
