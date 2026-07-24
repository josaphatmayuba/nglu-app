export const CODEC2_MODE_700C = 8;

let modulePromise;

function codec2AssetUrl(file) {
  return `${import.meta.env.BASE_URL}codec2/${file}`;
}

async function loadCodec2Module() {
  if (!modulePromise) {
    modulePromise = import(/* @vite-ignore */ codec2AssetUrl("codec2.mjs"))
      .then(({ default: createModule }) => createModule({
        locateFile: (file) => codec2AssetUrl(file),
      }));
  }
  return modulePromise;
}

/**
 * Creates one stateful Codec2 encoder/decoder.
 * Codec2 keeps history between frames, so a state must not be shared by
 * independent audio directions.
 */
export async function createCodec2Codec({ mode = CODEC2_MODE_700C } = {}) {
  const module = await loadCodec2Module();
  const handle = module._codec2_wasm_create(mode);
  if (!handle) throw new Error("Codec2 initialization failed");

  const samplesPerFrame = module._codec2_wasm_samples_per_frame(handle);
  const bitsPerFrame = module._codec2_wasm_bits_per_frame(handle);
  const bytesPerFrame = module._codec2_wasm_bytes_per_frame(handle);
  const inputPtr = module._codec2_wasm_alloc(samplesPerFrame * Int16Array.BYTES_PER_ELEMENT);
  const outputPtr = module._codec2_wasm_alloc(bytesPerFrame);
  const decodedPtr = module._codec2_wasm_alloc(samplesPerFrame * Int16Array.BYTES_PER_ELEMENT);

  if (!inputPtr || !outputPtr || !decodedPtr) {
    module._codec2_wasm_destroy(handle);
    throw new Error("Codec2 memory allocation failed");
  }

  let closed = false;
  const ensureOpen = () => {
    if (closed) throw new Error("Codec2 instance is closed");
  };

  return {
    mode,
    samplesPerFrame,
    bitsPerFrame,
    bytesPerFrame,

    encode(samples) {
      ensureOpen();
      if (samples.length !== samplesPerFrame) {
        throw new RangeError(`Codec2 expects ${samplesPerFrame} samples per frame`);
      }
      module.HEAP16.set(samples, inputPtr >> 1);
      module._codec2_wasm_encode(handle, outputPtr, inputPtr);
      return module.HEAPU8.slice(outputPtr, outputPtr + bytesPerFrame);
    },

    decode(frame) {
      ensureOpen();
      if (frame.length !== bytesPerFrame) {
        throw new RangeError(`Codec2 expects ${bytesPerFrame} bytes per frame`);
      }
      module.HEAPU8.set(frame, outputPtr);
      module._codec2_wasm_decode(handle, decodedPtr, outputPtr);
      return module.HEAP16.slice(decodedPtr >> 1, (decodedPtr >> 1) + samplesPerFrame);
    },

    close() {
      if (closed) return;
      closed = true;
      module._codec2_wasm_free(inputPtr);
      module._codec2_wasm_free(outputPtr);
      module._codec2_wasm_free(decodedPtr);
      module._codec2_wasm_destroy(handle);
    },
  };
}
