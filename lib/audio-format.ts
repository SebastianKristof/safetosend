/** Downsample mono PCM and encode a compact, transcription-compatible 16-bit WAV.
 *  Used only when the browser cannot record compressed Opus/AAC directly.
 */
export function encodeMonoWav(chunks: Float32Array[], inputSampleRate: number, outputSampleRate = 16_000): Blob {
  if (inputSampleRate <= 0 || outputSampleRate <= 0) {
    throw new Error('Invalid audio sample rate.')
  }

  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  if (!totalSamples) return new Blob([], { type: 'audio/wav' })

  const ratio = Math.max(1, inputSampleRate / outputSampleRate)
  const actualSampleRate = inputSampleRate < outputSampleRate ? inputSampleRate : outputSampleRate
  const outputSamples = Math.ceil(totalSamples / ratio)
  const buffer = new ArrayBuffer(44 + outputSamples * 2)
  const view = new DataView(buffer)

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, actualSampleRate, true)
  view.setUint32(28, actualSampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, outputSamples * 2, true)

  // Read across chunk boundaries without merging into another large buffer.
  let chunkIndex = 0
  let chunkOffset = 0
  const getSample = () => {
    while (chunkIndex < chunks.length && chunkOffset >= chunks[chunkIndex].length) {
      chunkIndex += 1
      chunkOffset = 0
    }
    if (chunkIndex >= chunks.length) return 0
    return chunks[chunkIndex][chunkOffset++]
  }

  // Average samples in each output interval (anti-aliasing for speech).
  let inputIndex = 0
  for (let outIndex = 0; outIndex < outputSamples; outIndex += 1) {
    const target = Math.min(totalSamples, Math.round((outIndex + 1) * ratio))
    let count = 0
    let sum = 0
    while (inputIndex < target) {
      sum += getSample()
      inputIndex += 1
      count += 1
    }
    const value = Math.max(-1, Math.min(1, count ? sum / count : 0))
    view.setInt16(44 + outIndex * 2, value < 0 ? Math.round(value * 32768) : Math.round(value * 32767), true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export function audioFileExtension(mimeType: string): string {
  const mime = mimeType.toLowerCase()
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a')) return 'mp4'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}
