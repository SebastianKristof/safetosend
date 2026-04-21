import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { AnalysisResponse, AssistantRequest, QuickAction } from './assistant-contracts'

const audienceTone = {
  boss: 'professional, concise, and respectful',
  client: 'clear, calm, and relationship-safe',
  colleague: 'direct but collaborative',
  partner: 'warm, grounded, and non-defensive',
  other: 'neutral, clear, and low-friction',
} as const

type PromptBundle = {
  analyzeSystem: string
  analyzeUser: string
  transformSystem: string
  generateUser: string
  quickActionUser: string
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
      readPrompt('prompts/generate-user.md'),
      readPrompt('prompts/quick-action-user.md'),
      readPrompt('prompts/edit-user.md'),
    ]).then(
      ([analyzeSystem, analyzeUser, transformSystem, generateUser, quickActionUser, editUser]) =>
        ({
          analyzeSystem,
          analyzeUser,
          transformSystem,
          generateUser,
          quickActionUser,
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
  const goal = request.goal.trim() || 'Not specified'
  return renderPrompt(template, {
    audience: request.audience,
    audience_tone: audienceTone[request.audience],
    goal,
    text: request.text.trim(),
  })
}

export function buildQuickActionPrompt(request: AssistantRequest, action: QuickAction, template: string) {
  const goal = request.goal.trim() || 'Not specified'
  const context = buildAnalysisContext(request)

  return renderPrompt(template, {
    audience: request.audience,
    audience_tone: audienceTone[request.audience],
    goal,
    action,
    context,
    text: request.text.trim(),
  })
}

export function buildGeneratePrompt(request: AssistantRequest, template: string) {
  const goal = request.goal.trim() || 'Not specified'
  const context = buildAnalysisContext(request)

  return renderPrompt(template, {
    audience: request.audience,
    audience_tone: audienceTone[request.audience],
    goal,
    context,
    text: request.text.trim(),
  })
}

export function buildEditPrompt(request: AssistantRequest, template: string) {
  const goal = request.goal.trim() || 'Not specified'
  const context = buildAnalysisContext(request)
  const instruction = request.instruction?.trim() || ''

  return renderPrompt(template, {
    audience: request.audience,
    audience_tone: audienceTone[request.audience],
    goal,
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
    context.reasons?.length ? `Previous reasons: ${context.reasons.join(' | ')}` : '',
  ].filter(Boolean)

  return parts.length ? `Context: ${parts.join(' / ')}` : ''
}

export function summarizeAnalysisForContext(result: AnalysisResponse) {
  return {
    verdict: result.verdict,
    reasons: result.reasons,
    inferredGoal: result.inferredGoal,
  }
}
