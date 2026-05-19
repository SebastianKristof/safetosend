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
  assert.match(system, /meaning verification, not prose quality/i)
  assert.match(system, /prefer literal translation for the core ask/i)
  assert.match(system, /do not replace an action ask with a meta ask/i)
  assert.match(system, /back-translation check/i)
  assert.match(user, /localizedMeaning/i)
  assert.match(user, /interface language/i)
  assert.match(user, /literal-leaning meaning gloss/i)
  assert.match(user, /meaning verification, not prose quality/i)
  assert.match(user, /prefer literal translation for the core ask/i)
  assert.match(user, /do not turn an explicit action ask into a meta ask/i)
  assert.match(user, /back-translation check/i)
})
