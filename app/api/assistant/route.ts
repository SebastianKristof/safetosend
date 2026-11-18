import { enforceAnalysisInvariants } from '@/lib/analysis-invariants'
import { generateText, Output } from 'ai'
import { NextResponse } from 'next/server'
import {
  analysisResponseSchema,
  assistantRequestSchema,
  editResponseSchema,
  type AnalysisResponse,
} from '@/lib/assistant-contracts'
import { getInferenceConfig, resolveInferenceModel } from '@/lib/inference-config'
import {
  buildAnalysisPrompt,
  buildEditPrompt,
  getPromptBundle,
} from '@/lib/assistant-prompts'
import { MAX_DRAFT_CHARS } from '@/lib/draft-limits'
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
      draftTooLong: `Draft is too long. Maximum is ${MAX_DRAFT_CHARS} characters.`,
      missingInstruction: 'Missing edit instruction.',
      requestFailed: 'AI request failed.',
    },
    ru: {
      missingDraft: 'Не хватает текста черновика.',
      draftTooLong: `Черновик слишком длинный. Максимум ${MAX_DRAFT_CHARS} символов.`,
      missingInstruction: 'Не хватает инструкции для правки.',
      requestFailed: 'Запрос к ИИ не удался.',
    },
    es: {
      missingDraft: 'Falta el texto del borrador.',
      draftTooLong: `El borrador es demasiado largo. El maximo es ${MAX_DRAFT_CHARS} caracteres.`,
      missingInstruction: 'Falta la instruccion de edicion.',
      requestFailed: 'La solicitud a la IA fallo.',
    },
    de: {
      missingDraft: 'Entwurfstext fehlt.',
      draftTooLong: `Der Entwurf ist zu lang. Maximum sind ${MAX_DRAFT_CHARS} Zeichen.`,
      missingInstruction: 'Bearbeitungsanweisung fehlt.',
      requestFailed: 'Die KI-Anfrage ist fehlgeschlagen.',
    },
    fr: {
      missingDraft: 'Le texte du brouillon manque.',
      draftTooLong: `Le brouillon est trop long. Maximum: ${MAX_DRAFT_CHARS} caracteres.`,
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
      if (payload.text.trim().length > MAX_DRAFT_CHARS) {
        return NextResponse.json({ error: messages.draftTooLong }, { status: 400 })
      }

      const slot = inferenceConfig.textAnalysis
      const model = resolveInferenceModel(slot)

      const result = await generateText({
        model,
        system: prompts.analyzeSystem,
        prompt: buildAnalysisPrompt(payload, prompts.analyzeUser, prompts.audienceGuidance[payload.audience]),
        output: Output.object({
          schema: analysisResponseSchema,
        }),
        temperature: 0.2,
        maxOutputTokens: 1800,
        providerOptions: buildProviderOptions(slot.provider),
      })

      return NextResponse.json(enforceAnalysisInvariants(result.output, payload.text))
    }

    if (payload.text.trim().length < 3) {
      return NextResponse.json({ error: messages.missingDraft }, { status: 400 })
    }
    if (payload.text.trim().length > MAX_DRAFT_CHARS) {
      return NextResponse.json({ error: messages.draftTooLong }, { status: 400 })
    }

    if (!payload.instruction?.trim()) {
      return NextResponse.json({ error: messages.missingInstruction }, { status: 400 })
    }

    const slot = inferenceConfig.textGeneration
    const model = resolveInferenceModel(slot)

    const result = await generateText({
      model,
      prompt: buildEditPrompt(payload, prompts.editUser, prompts.audienceGuidance[payload.audience]),
      output: Output.object({
        schema: editResponseSchema,
      }),
      temperature: 0.35,
      maxOutputTokens: 1400,
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
