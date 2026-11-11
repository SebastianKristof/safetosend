import assert from 'node:assert/strict'
import test from 'node:test'
import { audioFileExtension, encodeMonoWav } from '../lib/audio-format.ts'

test('mime types map to upload extensions', () => {
  assert.equal(audioFileExtension('audio/webm;codecs=opus'), 'webm')
  assert.equal(audioFileExtension('audio/mp4'), 'mp4')
  assert.equal(audioFileExtension('audio/ogg;codecs=opus'), 'ogg')
  assert.equal(audioFileExtension('audio/wav'), 'wav')
})

test('fallback WAV is mono 16 kHz with valid RIFF headers', async () => {
  const chunks = [new Float32Array(4800).fill(0.25)]
  const wav = encodeMonoWav(chunks, 48_000)
  assert.equal(wav.type, 'audio/wav')
  const buffer = await wav.arrayBuffer()
  const view = new DataView(buffer)
  assert.equal(String.fromCharCode(...new Uint8Array(buffer.slice(0, 4))), 'RIFF')
  assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 16_000)
  assert.equal(view.getUint32(40, true), 3200)
  assert.equal(buffer.byteLength, 3244)
})

test('fallback WAV respects chunk boundaries and clamps samples', async () => {
  const wav = encodeMonoWav([new Float32Array([2]), new Float32Array([-2])], 16_000)
  const view = new DataView(await wav.arrayBuffer())
  assert.equal(view.getInt16(44, true), 32767)
  assert.equal(view.getInt16(46, true), -32768)
})
