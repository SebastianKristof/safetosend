import { gateway } from 'ai'
import { openai } from '@ai-sdk/openai'

export type InferenceProvider = 'vercel' | 'openai'
export type ModelSlot = 'voice' | 'textAnalysis' | 'textGeneration'

type SlotConfig = {
  provider: InferenceProvider
  model: string
}

type InferenceConfig = {
  voice: SlotConfig
  textAnalysis: SlotConfig
  textGeneration: SlotConfig
}

const DEFAULT_PROVIDER: InferenceProvider = 'vercel'

function resolveProvider(value: string | undefined, fallback: InferenceProvider): InferenceProvider {
  return value === 'openai' || value === 'vercel' ? value : fallback
}

function normalizeModelString(value: string | undefined, fallback: string) {
  return (value || fallback).trim()
}

function defaultModelFor(provider: InferenceProvider, fallback: string) {
  if (provider === 'openai') {
    return fallback.replace(/^openai\//, '')
  }

  return fallback.includes('/') ? fallback : `openai/${fallback}`
}

function getSlotConfig(
  providerKey: string,
  modelKey: string,
  defaultModel: string,
  globalProvider: InferenceProvider,
): SlotConfig {
  const provider = resolveProvider(process.env[providerKey], globalProvider)
  const model = normalizeModelString(process.env[modelKey], defaultModelFor(provider, defaultModel))

  return {
    provider,
    model,
  }
}

export function getInferenceConfig(): InferenceConfig {
  const globalProvider = resolveProvider(process.env.SAFETOSEND_INFERENCE_PROVIDER, DEFAULT_PROVIDER)

  return {
    voice: getSlotConfig(
      'SAFETOSEND_VOICE_PROVIDER',
      'SAFETOSEND_VOICE_MODEL',
      'openai/gpt-5.4',
      globalProvider,
    ),
    textAnalysis: getSlotConfig(
      'SAFETOSEND_TEXT_ANALYSIS_PROVIDER',
      'SAFETOSEND_TEXT_ANALYSIS_MODEL',
      'openai/gpt-5.4',
      globalProvider,
    ),
    textGeneration: getSlotConfig(
      'SAFETOSEND_TEXT_GENERATION_PROVIDER',
      'SAFETOSEND_TEXT_GENERATION_MODEL',
      'openai/gpt-5.4',
      globalProvider,
    ),
  }
}

export function resolveInferenceModel(slot: SlotConfig) {
  return slot.provider === 'openai' ? openai(slot.model) : gateway(slot.model)
}
