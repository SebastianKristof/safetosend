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
    return NextResponse.json(
      {
        error: 'Invalid request.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const payload = parsed.data
  const inferenceConfig = getInferenceConfig()
  const prompts = await getPromptBundle()

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
        return NextResponse.json({ error: 'Missing draft text.' }, { status: 400 })
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
      return NextResponse.json({ error: 'Missing draft text.' }, { status: 400 })
    }

    if (!payload.instruction?.trim()) {
      return NextResponse.json({ error: 'Missing edit instruction.' }, { status: 400 })
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
        error: 'AI request failed.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 },
    )
  }
}
