param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDir,
  [string]$Image = "emscripten/emsdk@sha256:bb0910e6a18bb9bd7cb31ae4ed40f9073148b78cb2cdb8ea8676454e0d85425c"
)

$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\")).Path
$source = (Resolve-Path $SourceDir).Path
$expectedCodec2Commit = "310777b1c6f1af0bc7c72f5b32f80f6fd9136962"
$actualCodec2Commit = (git -C $source rev-parse HEAD).Trim()
if ($actualCodec2Commit -ne $expectedCodec2Commit) {
  throw "Codec2 source commit mismatch. Expected $expectedCodec2Commit, got $actualCodec2Commit"
}
$output = Join-Path $repo "chat-app\public\codec2"
New-Item -ItemType Directory -Force -Path $output | Out-Null

$repoMount = "$repo`:/work"
$sourceMount = "$source`:/codec2:ro"

$command = @'
set -eu
rm -rf /tmp/codec2-build
mkdir -p /tmp/codec2-build /work/chat-app/public/codec2
emcmake cmake /codec2 \
  -B /tmp/codec2-build \
  -DBUILD_SHARED_LIBS=OFF \
  -DUNITTEST=OFF \
  -DLPCNET=OFF \
  -DCODEC2_MODE_EN_DEFAULT=0 \
  -DCODEC2_MODE_700C_EN=1
cmake --build /tmp/codec2-build --target codec2 -j2
emcc /work/chat-app/wasm/codec2_wrapper.c \
  -I/codec2/src \
  -I/tmp/codec2-build \
  /tmp/codec2-build/src/libcodec2.a \
  -O3 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS='[_malloc,_free,_codec2_wasm_create,_codec2_wasm_destroy,_codec2_wasm_samples_per_frame,_codec2_wasm_bits_per_frame,_codec2_wasm_bytes_per_frame,_codec2_wasm_encode,_codec2_wasm_decode,_codec2_wasm_alloc,_codec2_wasm_free]' \
  -s EXPORTED_RUNTIME_METHODS='[HEAP8,HEAP16,HEAPU8,HEAPU16]' \
  -o /work/chat-app/public/codec2/codec2.mjs
cp /codec2/COPYING /work/chat-app/public/codec2/COPYING
ls -lh /work/chat-app/public/codec2/codec2.mjs /work/chat-app/public/codec2/codec2.wasm
'@

docker run --rm `
  -v $repoMount `
  -v $sourceMount `
  $Image bash -lc $command
