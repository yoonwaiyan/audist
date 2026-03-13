// AudioWorklet processor for system audio capture.
// Receives audio frames from getUserMedia (desktop source), mixes down to mono,
// converts Float32 → Int16 PCM, and transfers the buffer back to the main thread.
class SystemAudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0] || input[0].length === 0) return true

    const channelCount = input.length
    const frameCount = input[0].length
    const int16 = new Int16Array(frameCount)

    for (let i = 0; i < frameCount; i++) {
      // Mix all channels down to mono
      let sample = 0
      for (let c = 0; c < channelCount; c++) {
        sample += input[c][i] ?? 0
      }
      sample /= channelCount
      // Clamp and convert Float32 → Int16
      int16[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32768)))
    }

    // Transfer the buffer (zero-copy) back to the renderer thread
    this.port.postMessage(int16.buffer, [int16.buffer])
    return true
  }
}

registerProcessor('system-audio-processor', SystemAudioProcessor)
