/* PCM fallback for browsers that do not expose a usable MediaRecorder.
   Capture is local; transcription still happens on the server. */
class SafeToSendAudioCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.chunks = new Float32Array(4096)
    this.used = 0
    this.port.onmessage = (event) => {
      if (event.data !== 'flush') return
      this.flush()
      this.port.postMessage({ type: 'flushed' })
    }
  }

  flush() {
    if (!this.used) return
    const output = this.chunks.slice(0, this.used)
    this.port.postMessage({ type: 'samples', samples: output }, [output.buffer])
    this.used = 0
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0]
    if (input) {
      for (let i = 0; i < input.length; i += 1) {
        this.chunks[this.used++] = input[i]
        if (this.used === this.chunks.length) this.flush()
      }
    }
    // No playback: keeping the node connected to destination drives processing.
    for (const channel of outputs[0] || []) channel.fill(0)
    return true
  }
}

registerProcessor('safetosend-audio-capture', SafeToSendAudioCapture)
