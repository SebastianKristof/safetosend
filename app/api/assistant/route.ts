import { generateText, gateway, Output } from 'ai'
import { NextResponse } from 'next/server'
import {
  analysisResponseSchema,
  assistantRequestSchema,
  transformResponseSchema,
} from '@/lib/assistant-contracts'
import {
  buildAnalysisPrompt,
  buildEditPrompt,
  buildQuickActionPrompt,
  getPromptBundle,
} from '@/lib/assistant-prompts'

const DEFAULT_MODEL = process.env.SAFETOSEND_MODEL || 'openai/gpt-5.4'

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
  const model = gateway(DEFAULT_MODEL)
  const prompts = await getPromptBundle()
  const gatewayOptions = {
    gateway: {
      user: payload.clientId || 'anonymous',
      tags: ['app:safetosend', `mode:${payload.mode}`, `audience:${payload.audience}`],
    },
  }

  try {
    if (payload.mode === 'analyze') {
      const result = await generateText({
        model,
        system: prompts.analyzeSystem,
        prompt: buildAnalysisPrompt(payload, prompts.analyzeUser),
        output: Output.object({
          schema: analysisResponseSchema,
        }),
        temperature: 0.2,
        maxOutputTokens: 450,
        providerOptions: gatewayOptions,
      })

      return NextResponse.json(result.output)
    }

    if (payload.mode === 'action') {
      if (!payload.action) {
        return NextResponse.json({ error: 'Missing quick action.' }, { status: 400 })
      }

      const result = await generateText({
        model,
        system: prompts.transformSystem,
        prompt: buildQuickActionPrompt(payload, payload.action, prompts.quickActionUser),
        output: Output.object({
          schema: transformResponseSchema,
        }),
        temperature: 0.45,
        maxOutputTokens: 320,
        providerOptions: gatewayOptions,
      })

      return NextResponse.json(result.output)
    }

    if (!payload.instruction?.trim()) {
      return NextResponse.json({ error: 'Missing edit instruction.' }, { status: 400 })
    }

    const result = await generateText({
      model,
      system: prompts.transformSystem,
      prompt: buildEditPrompt(payload, prompts.editUser),
      output: Output.object({
        schema: transformResponseSchema,
      }),
      temperature: 0.35,
      maxOutputTokens: 320,
      providerOptions: gatewayOptions,
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
