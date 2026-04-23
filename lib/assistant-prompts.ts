import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { AnalysisResponse, AssistantRequest } from './assistant-contracts'

const audienceTone = {
  boss: 'professional, concise, and respectful',
  client: 'clear, calm, and relationship-safe',
  colleague: 'direct but collaborative',
  partner: 'warm, grounded, and non-defensive',
  other: 'neutral, clear, and low-friction',
} as const

const languageName = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
} as const

const languageInstruction = {
  en: 'Use English for explanations and change notes. Keep the draft text in English.',
  ru: 'Используй русский для пояснений и описания изменений. Текст черновика оставляй на английском.',
  es: 'Usa espanol para las explicaciones y las notas de cambios. Mantén el texto del borrador en ingles.',
  de: 'Verwende Deutsch fuer Erklaerungen und Aenderungsnotizen. Halte den Entwurfstext auf Englisch.',
  fr: 'Utilise le francais pour les explications et les notes de modification. Garde le texte du brouillon en anglais.',
} as const

type PromptBundle = {
  analyzeSystem: string
  analyzeUser: string
  transformSystem: string
  editUser: string
}

let promptBundlePromise: Promise<PromptBundle> | null = null

async function readPrompt(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath)
  return (await readFile(absolutePath, 'utf8')).trim()
}

export async function getPromptBundle() {
  if (!promptBundlePromise) {
    promptBundlePromise = Promise.all([
      readPrompt('prompts/analyze-system.md'),
      readPrompt('prompts/analyze-user.md'),
      readPrompt('prompts/transform-system.md'),
      readPrompt('prompts/edit-user.md'),
    ]).then(
      ([analyzeSystem, analyzeUser, transformSystem, editUser]) =>
        ({
          analyzeSystem,
          analyzeUser,
          transformSystem,
          editUser,
        }) satisfies PromptBundle,
    )
  }

  return promptBundlePromise
}

export function renderPrompt(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '')
}

export function buildAnalysisPrompt(request: AssistantRequest, template: string) {
  return renderPrompt(template, {
    audience: request.audience,
    audience_tone: audienceTone[request.audience],
    language_instruction: languageInstruction[request.locale],
    language_name: languageName[request.locale],
    locale: request.locale,
    text: request.text.trim(),
  })
}

export function buildEditPrompt(request: AssistantRequest, template: string) {
  const context = buildAnalysisContext(request)
  const instruction = request.instruction?.trim() || ''

  return renderPrompt(template, {
    audience: request.audience,
    audience_tone: audienceTone[request.audience],
    language_instruction: languageInstruction[request.locale],
    language_name: languageName[request.locale],
    locale: request.locale,
    context,
    text: request.text.trim(),
    instruction,
  })
}

function buildAnalysisContext(request: AssistantRequest) {
  const context = request.analysisContext
  if (!context) {
    return ''
  }

  const parts = [
    context.verdict ? `Previous verdict: ${context.verdict}` : '',
    context.inferredGoal ? `Previous inferred goal: ${context.inferredGoal}` : '',
    context.reason ? `Previous reason: ${context.reason}` : '',
  ].filter(Boolean)

  return parts.length ? `Context: ${parts.join(' / ')}` : ''
}

export function summarizeAnalysisForContext(result: AnalysisResponse) {
  return {
    verdict: result.verdict,
    reason: result.reason,
    inferredGoal: result.inferredGoal,
  }
}
