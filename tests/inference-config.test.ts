import assert from 'node:assert/strict'
import test from 'node:test'

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    fn()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('inference config defaults to OpenAI-ready slugs', async () => {
  const { getInferenceConfig } = await import('../lib/inference-config.ts')

  withEnv(
    {
      SAFETOSEND_INFERENCE_PROVIDER: undefined,
      SAFETOSEND_TEXT_ANALYSIS_PROVIDER: undefined,
      SAFETOSEND_TEXT_ANALYSIS_MODEL_PROVIDER: undefined,
      SAFETOSEND_TEXT_ANALYSIS_MODEL_NAME: undefined,
      SAFETOSEND_TEXT_ANALYSIS_MODEL: undefined,
      SAFETOSEND_TEXT_GENERATION_PROVIDER: undefined,
      SAFETOSEND_TEXT_GENERATION_MODEL_PROVIDER: undefined,
      SAFETOSEND_TEXT_GENERATION_MODEL_NAME: undefined,
      SAFETOSEND_TEXT_GENERATION_MODEL: undefined,
      SAFETOSEND_VOICE_PROVIDER: undefined,
      SAFETOSEND_VOICE_MODEL_PROVIDER: undefined,
      SAFETOSEND_VOICE_MODEL_NAME: undefined,
      SAFETOSEND_VOICE_MODEL: undefined,
    },
    () => {
      const config = getInferenceConfig()

      assert.equal(config.textAnalysis.provider, 'openai')
      assert.equal(config.textAnalysis.modelProvider, 'openai')
      assert.equal(config.textAnalysis.modelName, 'gpt-5.4')
      assert.equal(config.textGeneration.provider, 'openai')
      assert.equal(config.voice.provider, 'openai')
      assert.equal(config.voice.modelProvider, 'openai')
      assert.equal(config.voice.modelName, 'gpt-4o-mini-transcribe')
    },
  )
})

test('inference config preserves explicit OpenRouter model slugs', async () => {
  const { getInferenceConfig } = await import('../lib/inference-config.ts')

  withEnv(
    {
      SAFETOSEND_INFERENCE_PROVIDER: 'openrouter',
      SAFETOSEND_TEXT_ANALYSIS_PROVIDER: 'openrouter',
      SAFETOSEND_TEXT_ANALYSIS_MODEL_PROVIDER: 'anthropic',
      SAFETOSEND_TEXT_ANALYSIS_MODEL_NAME: 'claude-3.5-sonnet',
    },
    () => {
      const config = getInferenceConfig()

      assert.equal(config.textAnalysis.provider, 'openrouter')
      assert.equal(config.textAnalysis.modelProvider, 'anthropic')
      assert.equal(config.textAnalysis.modelName, 'claude-3.5-sonnet')
    },
  )
})
