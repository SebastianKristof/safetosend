import { z } from 'zod'

export const audienceSchema = z.enum(['boss', 'client', 'colleague', 'partner', 'other'])

export const quickActionSchema = z.enum([
  'softer',
  'firmer',
  'shorter',
  'more direct',
  'more polite',
])

export const verdictSchema = z.enum(['OK to send', 'Risky - revise', 'Do not send yet'])

export const riskLevelSchema = z.enum(['low', 'medium', 'high'])

export const analysisResponseSchema = z.object({
  verdict: verdictSchema,
  riskLevel: riskLevelSchema,
  reasons: z.array(z.string().min(1)).min(1).max(3),
  suggestedText: z.string().min(1),
  inferredGoal: z.string().min(1),
  recommendedTone: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

export const transformResponseSchema = z.object({
  updatedText: z.string().min(1),
  note: z.string().min(1),
})

export const assistantRequestSchema = z.object({
  mode: z.enum(['analyze', 'action', 'edit', 'generate']),
  text: z.string().default(''),
  audience: audienceSchema,
  goal: z.string().default(''),
  action: quickActionSchema.optional(),
  instruction: z.string().optional(),
  clientId: z.string().optional(),
  analysisContext: z
    .object({
      verdict: verdictSchema.optional(),
      reasons: z.array(z.string()).optional(),
      inferredGoal: z.string().optional(),
    })
    .optional(),
})

export type Audience = z.infer<typeof audienceSchema>
export type QuickAction = z.infer<typeof quickActionSchema>
export type Verdict = z.infer<typeof verdictSchema>
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>
export type TransformResponse = z.infer<typeof transformResponseSchema>
export type AssistantRequest = z.infer<typeof assistantRequestSchema>
