import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

async function readPrompt(relativePath: string) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('analysis prompts instruct the model to return localizedMeaning', async () => {
  const [system, user] = await Promise.all([
    readPrompt('prompts/analyze-system.md'),
    readPrompt('prompts/analyze-user.md'),
  ])

  assert.match(system, /localizedMeaning/i)
  assert.match(system, /verification aid/i)
  assert.match(user, /localizedMeaning/i)
  assert.match(user, /interface language/i)
})
