#include <stdint.h>
#include <stdlib.h>

#include <codec2.h>
#include <emscripten/emscripten.h>

typedef struct {
  struct CODEC2 *codec;
  int samples_per_frame;
  int bits_per_frame;
  int bytes_per_frame;
} codec2_wasm_state;

EMSCRIPTEN_KEEPALIVE
uintptr_t codec2_wasm_create(int mode) {
  struct CODEC2 *codec = codec2_create(mode);
  if (!codec) return 0;

  codec2_wasm_state *state = calloc(1, sizeof(*state));
  if (!state) {
    codec2_destroy(codec);
    return 0;
  }

  state->codec = codec;
  state->samples_per_frame = codec2_samples_per_frame(codec);
  state->bits_per_frame = codec2_bits_per_frame(codec);
  state->bytes_per_frame = codec2_bytes_per_frame(codec);
  return (uintptr_t)state;
}

EMSCRIPTEN_KEEPALIVE
void codec2_wasm_destroy(uintptr_t handle) {
  codec2_wasm_state *state = (codec2_wasm_state *)handle;
  if (!state) return;
  codec2_destroy(state->codec);
  free(state);
}

EMSCRIPTEN_KEEPALIVE
int codec2_wasm_samples_per_frame(uintptr_t handle) {
  codec2_wasm_state *state = (codec2_wasm_state *)handle;
  return state ? state->samples_per_frame : 0;
}

EMSCRIPTEN_KEEPALIVE
int codec2_wasm_bits_per_frame(uintptr_t handle) {
  codec2_wasm_state *state = (codec2_wasm_state *)handle;
  return state ? state->bits_per_frame : 0;
}

EMSCRIPTEN_KEEPALIVE
int codec2_wasm_bytes_per_frame(uintptr_t handle) {
  codec2_wasm_state *state = (codec2_wasm_state *)handle;
  return state ? state->bytes_per_frame : 0;
}

EMSCRIPTEN_KEEPALIVE
void codec2_wasm_encode(uintptr_t handle, uintptr_t output, uintptr_t samples) {
  codec2_wasm_state *state = (codec2_wasm_state *)handle;
  if (!state || !output || !samples) return;
  codec2_encode(state->codec, (unsigned char *)output, (short *)samples);
}

EMSCRIPTEN_KEEPALIVE
void codec2_wasm_decode(uintptr_t handle, uintptr_t samples, uintptr_t input) {
  codec2_wasm_state *state = (codec2_wasm_state *)handle;
  if (!state || !input || !samples) return;
  codec2_decode(state->codec, (short *)samples, (const unsigned char *)input);
}

EMSCRIPTEN_KEEPALIVE
uintptr_t codec2_wasm_alloc(uint32_t size) {
  return (uintptr_t)malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void codec2_wasm_free(uintptr_t address) {
  free((void *)address);
}
