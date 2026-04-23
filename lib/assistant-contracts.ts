import { z } from 'zod'

export const audienceSchema = z.enum(['boss', 'client', 'colleague', 'partner', 'other'])
export const localeSchema = z.enum(['en', 'ru', 'es', 'de', 'fr'])
export const verdictSchema = z.enum(['Safe to send', 'Risky - revise', 'Do not send yet'])

export const analysisHighlightSchema = z.object({
  text: z.string().min(1),
  severity: z.enum(['yellow', 'red']),
  reason: z.string().min(1),
})

export const transformChangeSchema = z.object({
  summary: z.string().min(1),
  before: z.string(),
  after: z.string(),
})

export const analysisResponseSchema = z.object({
  verdict: verdictSchema,
  reason: z.string().min(1),
  highlights: z.array(analysisHighlightSchema).max(5),
  suggestedText: z.string().min(1),
  inferredGoal: z.string().min(1),
  recommendedTone: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

export const transformResponseSchema = z.object({
  updatedText: z.string().min(1),
  note: z.string().min(1),
  changes: z.array(transformChangeSchema).min(1).max(3),
})

export const assistantRequestSchema = z.object({
  mode: z.enum(['analyze', 'edit']),
  text: z.string().default(''),
  audience: audienceSchema,
  locale: localeSchema.default('en'),
  instruction: z.string().optional(),
  clientId: z.string().optional(),
  analysisContext: z
    .object({
      verdict: verdictSchema.optional(),
      reason: z.string().optional(),
      inferredGoal: z.string().optional(),
    })
    .optional(),
})

export type Audience = z.infer<typeof audienceSchema>
export type Locale = z.infer<typeof localeSchema>
export type Verdict = z.infer<typeof verdictSchema>
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>
export type AnalysisHighlight = z.infer<typeof analysisHighlightSchema>
export type TransformChange = z.infer<typeof transformChangeSchema>
export type TransformResponse = z.infer<typeof transformResponseSchema>
export type AssistantRequest = z.infer<typeof assistantRequestSchema>
