import { gateway } from 'ai'
import { openai } from '@ai-sdk/openai'

export type InferenceProvider = 'vercel' | 'openai'
export type ModelSlot = 'voice' | 'textAnalysis' | 'textGeneration'

type SlotConfig = {
  provider: InferenceProvider
  modelProvider: string
  modelName: string
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

function splitCombinedModel(value: string) {
  const trimmed = value.trim()
  const slashIndex = trimmed.indexOf('/')

  if (slashIndex === -1) {
    return {
      modelProvider: '',
      modelName: trimmed,
    }
  }

  return {
    modelProvider: trimmed.slice(0, slashIndex).trim(),
    modelName: trimmed.slice(slashIndex + 1).trim(),
  }
}

function normalizeModelProvider(provider: InferenceProvider, value: string | undefined, fallback: string) {
  if (provider === 'openai') {
    return 'openai'
  }

  return (value || fallback || 'openai').trim() || 'openai'
}

function normalizeModelName(provider: InferenceProvider, value: string | undefined, fallback: string) {
  const raw = (value || fallback).trim()

  if (provider === 'openai') {
    return raw.replace(/^[^/]+\//, '')
  }

  return raw.replace(/^[^/]+\//, '')
}

function getSlotConfig(
  providerKey: string,
  modelProviderKey: string,
  modelNameKey: string,
  legacyModelKey: string,
  defaultModelProvider: string,
  defaultModelName: string,
  globalProvider: InferenceProvider,
): SlotConfig {
  const provider = resolveProvider(process.env[providerKey], globalProvider)
  const legacy = process.env[legacyModelKey]?.trim()
  const legacyParts = legacy ? splitCombinedModel(legacy) : null

  const modelProvider = normalizeModelProvider(
    provider,
    process.env[modelProviderKey] || legacyParts?.modelProvider,
    defaultModelProvider,
  )
  const modelName = normalizeModelName(
    provider,
    process.env[modelNameKey] || legacyParts?.modelName,
    defaultModelName,
  )

  return {
    provider,
    modelProvider,
    modelName,
  }
}

export function getInferenceConfig(): InferenceConfig {
  const globalProvider = resolveProvider(process.env.SAFETOSEND_INFERENCE_PROVIDER, DEFAULT_PROVIDER)

  return {
    voice: getSlotConfig(
      'SAFETOSEND_VOICE_PROVIDER',
      'SAFETOSEND_VOICE_MODEL_PROVIDER',
      'SAFETOSEND_VOICE_MODEL_NAME',
      'SAFETOSEND_VOICE_MODEL',
      'openai',
      'gpt-5.4',
      globalProvider,
    ),
    textAnalysis: getSlotConfig(
      'SAFETOSEND_TEXT_ANALYSIS_PROVIDER',
      'SAFETOSEND_TEXT_ANALYSIS_MODEL_PROVIDER',
      'SAFETOSEND_TEXT_ANALYSIS_MODEL_NAME',
      'SAFETOSEND_TEXT_ANALYSIS_MODEL',
      'openai',
      'gpt-5.4',
      globalProvider,
    ),
    textGeneration: getSlotConfig(
      'SAFETOSEND_TEXT_GENERATION_PROVIDER',
      'SAFETOSEND_TEXT_GENERATION_MODEL_PROVIDER',
      'SAFETOSEND_TEXT_GENERATION_MODEL_NAME',
      'SAFETOSEND_TEXT_GENERATION_MODEL',
      'openai',
      'gpt-5.4',
      globalProvider,
    ),
  }
}

export function resolveInferenceModel(slot: SlotConfig) {
  return slot.provider === 'openai'
    ? openai(slot.modelName)
    : gateway(`${slot.modelProvider}/${slot.modelName}`)
}
