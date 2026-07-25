import createCodec2Module from "./codec2.mjs";

const CODEC2_MODE_700C = 8;
const CODEC2_SAMPLE_RATE = 8000;

// The global `URL` constructor isn't guaranteed inside AudioWorkletGlobalScope
// on every browser (observed missing on Edge/Chrome Android) — resolve the
// sibling file path manually instead of `new URL(file, import.meta.url)`.
function resolveSiblingUrl(file) {
  return import.meta.url.slice(0, import.meta.url.lastIndexOf("/") + 1) + file;
}

class Codec2DuplexProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.module = null;
    this.handle = 0;
    this.inputPtr = 0;
    this.outputPtr = 0;
    this.decodedPtr = 0;
    this.samplesPerFrame = 0;
    this.bytesPerFrame = 0;
    this.captureBuffer = [];
    this.capturePosition = 0;
    this.captureStep = sampleRate / CODEC2_SAMPLE_RATE;
    this.captureFrame = null;
    this.captureFrameOffset = 0;
    this.playbackBuffer = [];
    this.playbackPosition = 0;
    this.playbackStep = CODEC2_SAMPLE_RATE / sampleRate;
    this.closed = false;

    this.port.onmessage = (event) => this.handleMessage(event.data);
    this.initialize();
  }

  async initialize() {
    try {
      this.module = await createCodec2Module({
        locateFile: resolveSiblingUrl,
      });
      if (this.closed) return;
      this.handle = this.module._codec2_wasm_create(CODEC2_MODE_700C);
      this.samplesPerFrame = this.module._codec2_wasm_samples_per_frame(this.handle);
      this.bytesPerFrame = this.module._codec2_wasm_bytes_per_frame(this.handle);
      this.inputPtr = this.module._codec2_wasm_alloc(this.samplesPerFrame * 2);
      this.outputPtr = this.module._codec2_wasm_alloc(this.bytesPerFrame);
      this.decodedPtr = this.module._codec2_wasm_alloc(this.samplesPerFrame * 2);
      this.port.postMessage({
        type: "ready",
        sampleRate: CODEC2_SAMPLE_RATE,
        samplesPerFrame: this.samplesPerFrame,
        bytesPerFrame: this.bytesPerFrame,
      });
    } catch (error) {
      this.port.postMessage({ type: "error", message: error?.message || "Codec2 initialization failed" });
    }
  }

  handleMessage(message) {
    if (!message || this.closed) return;
    if (message.type === "frame" && message.frame) {
      this.decodeFrame(new Uint8Array(message.frame));
    } else if (message.type === "close") {
      this.release();
    }
  }

  decodeFrame(frame) {
    if (!this.module || frame.length !== this.bytesPerFrame) return;
    this.module.HEAPU8.set(frame, this.outputPtr);
    this.module._codec2_wasm_decode(this.handle, this.decodedPtr, this.outputPtr);
    const decoded = this.module.HEAP16.slice(
      this.decodedPtr >> 1,
      (this.decodedPtr >> 1) + this.samplesPerFrame,
    );
    for (const sample of decoded) this.playbackBuffer.push(sample / 32768);
  }

  encodeFrame(frame) {
    if (!this.module) return;
    this.module.HEAP16.set(frame, this.inputPtr >> 1);
    this.module._codec2_wasm_encode(this.handle, this.outputPtr, this.inputPtr);
    const encoded = this.module.HEAPU8.slice(this.outputPtr, this.outputPtr + this.bytesPerFrame);
    this.port.postMessage({ type: "frame", frame: encoded.buffer }, [encoded.buffer]);
  }

  capture(input) {
    if (!this.module || !this.samplesPerFrame || !input?.length) return;
    for (const sample of input) this.captureBuffer.push(sample);

    while (this.capturePosition + 1 < this.captureBuffer.length) {
      const index = Math.floor(this.capturePosition);
      const fraction = this.capturePosition - index;
      const sample = this.captureBuffer[index] * (1 - fraction)
        + this.captureBuffer[index + 1] * fraction;
      this.captureFrame ??= new Int16Array(this.samplesPerFrame);
      this.captureFrame[this.captureFrameOffset++] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      this.capturePosition += this.captureStep;

      if (this.captureFrameOffset === this.samplesPerFrame) {
        this.encodeFrame(this.captureFrame);
        this.captureFrame = null;
        this.captureFrameOffset = 0;
      }
    }

    const consumed = Math.floor(this.capturePosition);
    if (consumed > 0) {
      this.captureBuffer.splice(0, consumed);
      this.capturePosition -= consumed;
    }
  }

  playback(output) {
    for (let i = 0; i < output.length; i += 1) {
      if (this.playbackPosition + 1 >= this.playbackBuffer.length) {
        output[i] = 0;
        continue;
      }
      const index = Math.floor(this.playbackPosition);
      const fraction = this.playbackPosition - index;
      output[i] = this.playbackBuffer[index] * (1 - fraction)
        + this.playbackBuffer[index + 1] * fraction;
      this.playbackPosition += this.playbackStep;
    }

    const consumed = Math.floor(this.playbackPosition);
    if (consumed > 0) {
      this.playbackBuffer.splice(0, consumed);
      this.playbackPosition -= consumed;
    }
  }

  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (output) output.fill(0);
    if (this.closed) return false;

    this.capture(inputs[0]?.[0]);
    if (output) this.playback(output);
    return true;
  }

  release() {
    if (this.closed) return;
    this.closed = true;
    if (this.module && this.handle) {
      this.module._codec2_wasm_free(this.inputPtr);
      this.module._codec2_wasm_free(this.outputPtr);
      this.module._codec2_wasm_free(this.decodedPtr);
      this.module._codec2_wasm_destroy(this.handle);
    }
  }
}

registerProcessor("codec2-duplex", Codec2DuplexProcessor);
