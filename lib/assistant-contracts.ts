import { z } from 'zod'

export const audienceSchema = z.enum(['boss', 'client', 'colleague', 'partner', 'general'])
export const localeSchema = z.enum(['en', 'ru', 'es', 'de', 'fr'])
export const verdictSchema = z.enum(['Safe to send', 'Risky - revise', 'Do not send yet'])
export const editTypeSchema = z.enum([
  'exact_replacement',
  'fuzzy_replacement',
  'local_instruction',
  'preset_transform',
])

export const analysisHighlightSchema = z
  .object({
    text: z.string().min(1),
    severity: z.enum(['yellow', 'red']),
    reason: z.string().min(1),
  })
  .strict()

export const editChangeSchema = z
  .object({
    summary: z.string().min(1),
    before: z.string(),
    after: z.string(),
  })
  .strict()

export const analysisResponseSchema = z
  .object({
    verdict: verdictSchema,
    reason: z.string().min(1),
    highlights: z.array(analysisHighlightSchema).max(5),
    suggestedText: z.string().min(1),
    localizedMeaning: z.string().min(1),
    inferredGoal: z.string().min(1),
    recommendedTone: z.string().min(1),
  })
  .strict()

// The analysis model should not generate the translation; a separate, draft-only
// model call produces localizedMeaning so it cannot paraphrase suggestedText.
export const analysisModelResponseSchema = analysisResponseSchema.omit({ localizedMeaning: true })
export const meaningResponseSchema = z.object({ localizedMeaning: z.string().min(1) }).strict()

export const editResponseSchema = z
  .object({
    editType: editTypeSchema,
    appliedToWholeDraft: z.boolean(),
    updatedText: z.string().min(1),
    changes: z.array(editChangeSchema).min(1).max(3),
  })
  .strict()

export const assistantRequestSchema = z
  .object({
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
        recommendedTone: z.string().optional(),
        highlights: z.array(analysisHighlightSchema).max(5).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export type Audience = z.infer<typeof audienceSchema>
export type Locale = z.infer<typeof localeSchema>
export type Verdict = z.infer<typeof verdictSchema>
export type EditType = z.infer<typeof editTypeSchema>
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>
export type AnalysisHighlight = z.infer<typeof analysisHighlightSchema>
export type EditChange = z.infer<typeof editChangeSchema>
export type EditResponse = z.infer<typeof editResponseSchema>
export type AssistantRequest = z.infer<typeof assistantRequestSchema>
