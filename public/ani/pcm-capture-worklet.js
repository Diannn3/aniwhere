class AniPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Gemini recommends small realtime chunks. ~80 ms balances latency with
    // avoiding one WebSocket message per 128-frame render quantum.
    this.targetFrames = Math.max(128, Math.round(sampleRate * 0.08));
    this.buffer = new Float32Array(this.targetFrames);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel?.length) return true;

    let cursor = 0;
    while (cursor < channel.length) {
      const available = this.targetFrames - this.offset;
      const count = Math.min(available, channel.length - cursor);
      this.buffer.set(channel.subarray(cursor, cursor + count), this.offset);
      this.offset += count;
      cursor += count;

      if (this.offset === this.targetFrames) {
        const ready = this.buffer;
        this.port.postMessage(ready.buffer, [ready.buffer]);
        this.buffer = new Float32Array(this.targetFrames);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor('ani-pcm-capture', AniPcmCaptureProcessor);
