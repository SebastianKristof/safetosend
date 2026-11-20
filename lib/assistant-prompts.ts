import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { AnalysisResponse, AssistantRequest, Audience } from './assistant-contracts.ts'

const languageName = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
} as const

const languageInstruction = {
  en: 'Use English for explanations, summaries, and change labels.',
  ru: 'Используй русский для пояснений, сводок и подписей изменений.',
  es: 'Usa el español para explicaciones, resúmenes y etiquetas de cambios.',
  de: 'Verwende Deutsch für Erklärungen, Zusammenfassungen und Änderungslabels.',
  fr: 'Utilise le français pour les explications, les résumés et les libellés de changement.',
} as const

type PromptBundle = {
  analyzeSystem: string
  editSystem: string
  analyzeUser: string
  meaningSystem: string
  meaningUser: string
  editUser: string
  audienceGuidance: Record<Audience, string>
}

let promptBundlePromise: Promise<PromptBundle> | null = null

async function readPrompt(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath)
  return (await readFile(absolutePath, 'utf8')).trim()
}

export async function getPromptBundle() {
  if (process.env.NODE_ENV === 'development') {
    const [analyzeSystem, analyzeUser, meaningSystem, meaningUser, editUser, boss, client, colleague, partner, general, editSystem] = await Promise.all([
      readPrompt('prompts/analyze-system.md'),
      readPrompt('prompts/analyze-user.md'),
      readPrompt('prompts/meaning-system.md'),
      readPrompt('prompts/meaning-user.md'),
      readPrompt('prompts/edit-user.md'),
      readPrompt('prompts/audiences/boss.md'),
      readPrompt('prompts/audiences/client.md'),
      readPrompt('prompts/audiences/colleague.md'),
      readPrompt('prompts/audiences/partner.md'),
      readPrompt('prompts/audiences/general.md'),
      readPrompt('prompts/edit-system.md'),
    ])

    return {
      analyzeSystem,
      editSystem,
      analyzeUser,
      meaningSystem,
      meaningUser,
      editUser,
      audienceGuidance: {
        boss,
        client,
        colleague,
        partner,
        general,
      },
    } satisfies PromptBundle
  }

  if (!promptBundlePromise) {
    promptBundlePromise = Promise.all([
      readPrompt('prompts/analyze-system.md'),
      readPrompt('prompts/analyze-user.md'),
      readPrompt('prompts/meaning-system.md'),
      readPrompt('prompts/meaning-user.md'),
      readPrompt('prompts/edit-user.md'),
      readPrompt('prompts/audiences/boss.md'),
      readPrompt('prompts/audiences/client.md'),
      readPrompt('prompts/audiences/colleague.md'),
      readPrompt('prompts/audiences/partner.md'),
      readPrompt('prompts/audiences/general.md'),
      readPrompt('prompts/edit-system.md'),
    ]).then(
      ([analyzeSystem, analyzeUser, meaningSystem, meaningUser, editUser, boss, client, colleague, partner, general, editSystem]) =>
        ({
          analyzeSystem,
          editSystem,
          analyzeUser,
          meaningSystem,
          meaningUser,
          editUser,
          audienceGuidance: {
            boss,
            client,
            colleague,
            partner,
            general,
          },
        }) satisfies PromptBundle,
    )
  }

  return promptBundlePromise
}

export function renderPrompt(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '')
}

export function buildAnalysisPrompt(
  request: AssistantRequest,
  template: string,
  audienceDescription: string,
) {
  return renderPrompt(template, {
    audience: request.audience,
    audience_description: audienceDescription,
    language_instruction: languageInstruction[request.locale],
    language_name: languageName[request.locale],
    locale: request.locale,
    text: request.text.trim(),
    formality: request.style.formality,
    preserve_tone: String(request.style.preserveTone),
    english_variant: request.style.englishVariant,
    relationship_context: JSON.stringify(request.style.relationshipContext || 'Not supplied'),
  })
}

export function buildMeaningPrompt(request: AssistantRequest, template: string) {
  return renderPrompt(template, {
    locale: request.locale,
    language_name: languageName[request.locale],
    text: request.text.trim(),
  })
}

export function buildEditPrompt(
  request: AssistantRequest,
  template: string,
  audienceDescription: string,
) {
  const context = buildAnalysisContext(request)
  const instruction = request.instruction?.trim() || ''

  return renderPrompt(template, {
    audience: request.audience,
    audience_description: audienceDescription,
    language_instruction: languageInstruction[request.locale],
    language_name: languageName[request.locale],
    locale: request.locale,
    context,
    text: request.text.trim(),
    formality: request.style.formality,
    preserve_tone: String(request.style.preserveTone),
    english_variant: request.style.englishVariant,
    relationship_context: JSON.stringify(request.style.relationshipContext || 'Not supplied'),
    instruction,
  })
}

function buildAnalysisContext(request: AssistantRequest) {
  const context = request.analysisContext
  if (!context) {
    return ''
  }

  const highlightContext = context.highlights?.length
    ? `Previous highlighted spans: ${context.highlights
        .map((highlight) => `"${highlight.text}" (${highlight.severity}: ${highlight.reason})`)
        .join(' / ')}`
    : ''

  const parts = [
    context.verdict ? `Previous verdict: ${context.verdict}` : '',
    context.inferredGoal ? `Previous inferred goal: ${context.inferredGoal}` : '',
    context.reason ? `Previous reason: ${context.reason}` : '',
    context.recommendedTone ? `Previous recommended tone: ${context.recommendedTone}` : '',
    highlightContext,
  ].filter(Boolean)

  return parts.length ? `Context: ${parts.join(' / ')}` : ''
}

export function summarizeAnalysisForContext(result: AnalysisResponse) {
  return {
    verdict: result.verdict,
    reason: result.reason,
    inferredGoal: result.inferredGoal,
    recommendedTone: result.recommendedTone,
  }
}
