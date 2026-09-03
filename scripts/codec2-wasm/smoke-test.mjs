import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "chat-app", "public", "codec2");
const server = createServer(async (req, res) => {
  try {
    const file = await readFile(join(root, req.url === "/codec2.wasm" ? "codec2.wasm" : "codec2.mjs"));
    res.writeHead(200, { "Content-Type": req.url === "/codec2.wasm" ? "application/wasm" : "text/javascript" });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

try {
  const createModule = (await import(pathToFileURL(join(root, "codec2.mjs")).href)).default;
  const module = await createModule({ locateFile: () => `http://127.0.0.1:${port}/codec2.wasm` });
  const handle = module._codec2_wasm_create(8);
  if (!handle) throw new Error("Codec2 handle was not created");

  const samplesPerFrame = module._codec2_wasm_samples_per_frame(handle);
  const bitsPerFrame = module._codec2_wasm_bits_per_frame(handle);
  const bytesPerFrame = module._codec2_wasm_bytes_per_frame(handle);
  if (samplesPerFrame !== 320 || bitsPerFrame !== 28 || bytesPerFrame !== 4) {
    throw new Error(`Unexpected Codec2 frame: ${samplesPerFrame}/${bitsPerFrame}/${bytesPerFrame}`);
  }

  const inputPtr = module._codec2_wasm_alloc(samplesPerFrame * 2);
  const outputPtr = module._codec2_wasm_alloc(bytesPerFrame);
  const decodedPtr = module._codec2_wasm_alloc(samplesPerFrame * 2);
  const samples = new Int16Array(samplesPerFrame);
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.round(Math.sin((2 * Math.PI * 440 * i) / 8000) * 12000);
  }

  module.HEAP16.set(samples, inputPtr >> 1);
  module._codec2_wasm_encode(handle, outputPtr, inputPtr);
  const frame = module.HEAPU8.slice(outputPtr, outputPtr + bytesPerFrame);
  module._codec2_wasm_decode(handle, decodedPtr, outputPtr);
  const decoded = module.HEAP16.slice(decodedPtr >> 1, (decodedPtr >> 1) + samplesPerFrame);
  if (!frame.some(Boolean) || !decoded.some(Boolean)) throw new Error("Codec2 produced silence");

  module._codec2_wasm_free(inputPtr);
  module._codec2_wasm_free(outputPtr);
  module._codec2_wasm_free(decodedPtr);
  module._codec2_wasm_destroy(handle);
  console.log(`Codec2 smoke test passed: ${samplesPerFrame} samples -> ${bytesPerFrame} bytes`);
} finally {
  server.close();
}
