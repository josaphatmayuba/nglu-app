import { CODEC2_MODE_700C } from "./codec2.js";

export const ULTRA_PROTOCOL_VERSION = 1;
export const ULTRA_FRAME_BYTES = 4;
export const ULTRA_FRAMES_PER_PACKET = 5;
export const ULTRA_PACKET_HEADER_BYTES = 8;

const FLUSH_DELAY_MS = 200;

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function createPacket(frames, sequence, mode, bytesPerFrame) {
  const packet = new Uint8Array(
    ULTRA_PACKET_HEADER_BYTES + frames.length * bytesPerFrame,
  );
  const view = new DataView(packet.buffer);
  packet[0] = ULTRA_PROTOCOL_VERSION;
  packet[1] = mode;
  packet[2] = frames.length;
  packet[3] = bytesPerFrame;
  view.setUint16(4, sequence & 0xffff);

  let offset = ULTRA_PACKET_HEADER_BYTES;
  for (const frame of frames) {
    packet.set(frame, offset);
    offset += bytesPerFrame;
  }
  return packet;
}

function readPacket(packet, expectedMode, expectedBytesPerFrame, onFrame) {
  const bytes = asBytes(packet);
  if (!bytes || bytes.length < ULTRA_PACKET_HEADER_BYTES) return;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = bytes[0];
  const mode = bytes[1];
  const count = bytes[2];
  const bytesPerFrame = bytes[3];
  const sequence = view.getUint16(4);
  const expectedLength = ULTRA_PACKET_HEADER_BYTES + count * bytesPerFrame;

  if (
    version !== ULTRA_PROTOCOL_VERSION
    || mode !== expectedMode
    || bytesPerFrame !== expectedBytesPerFrame
    || count < 1
    || count > ULTRA_FRAMES_PER_PACKET
    || expectedLength !== bytes.length
  ) return;

  for (let index = 0; index < count; index += 1) {
    const start = ULTRA_PACKET_HEADER_BYTES + index * bytesPerFrame;
    onFrame(bytes.slice(start, start + bytesPerFrame), {
      sequence: (sequence + index) & 0xffff,
      mode,
    });
  }
}

/**
 * Batches Codec2 frames before sending them through Socket.IO. The packet
 * header keeps the transport independent from JSON and preserves frame order.
 */
export function createCodec2Transport(
  socket,
  callId,
  {
    mode = CODEC2_MODE_700C,
    bytesPerFrame = ULTRA_FRAME_BYTES,
    onFrame,
    onState,
  } = {},
) {
  let closed = false;
  let sequence = 0;
  let pending = [];
  let flushTimer = null;
  // Derniere sequence jouee : sert a rejeter les trames trop vieilles et a
  // ne jamais faire reculer le decodeur Codec2.
  let lastPlayedSequence = -1;
  let sequenceInitialized = false;

  const flush = () => {
    flushTimer = null;
    if (closed || !socket?.connected || pending.length === 0) return;

    const frames = pending;
    pending = [];
    const packet = createPacket(frames, sequence, mode, bytesPerFrame);
    sequence = (sequence + frames.length) & 0xffff;
    socket.emit("call:ultra:frame", { callId, packet: packet.buffer });
  };

  const scheduleFlush = () => {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  };

  // Distance signee entre deux sequences 16 bits, en tenant compte du
  // wraparound (ex: 65534 -> 2 doit compter comme +4, pas -65532).
  const sequenceDelta = (a, b) => (((a - b) & 0xffff) << 16 >> 16);

  const acceptFrame = (frame, meta) => {
    if (!sequenceInitialized) {
      sequenceInitialized = true;
      lastPlayedSequence = meta.sequence;
      onFrame?.(frame, meta);
      return;
    }
    // delta <= 0 : trame deja jouee ou reordonnee en retard -> abandonnee,
    // qu'elle soit legerement en retard ou tres vieille (wraparound compris).
    const delta = sequenceDelta(meta.sequence, lastPlayedSequence);
    if (delta <= 0) return;
    lastPlayedSequence = meta.sequence;
    onFrame?.(frame, meta);
  };

  const receive = (data) => {
    if (closed || Number(data?.callId) !== Number(callId)) return;
    readPacket(data.packet, mode, bytesPerFrame, acceptFrame);
  };

  socket?.on("call:ultra:frame", receive);
  if (socket?.connected) {
    socket.emit("call:ultra:ready", { callId, mode, bytesPerFrame });
  }
  onState?.({ type: "transport-ready", mode, bytesPerFrame });

  return {
    sendFrame(frame) {
      if (closed) return false;
      const bytes = asBytes(frame);
      if (!bytes || bytes.length !== bytesPerFrame) return false;
      pending.push(bytes.slice());
      if (pending.length >= ULTRA_FRAMES_PER_PACKET) flush();
      else scheduleFlush();
      return true;
    },

    close() {
      if (closed) return;
      closed = true;
      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = null;
      pending = [];
      socket?.off("call:ultra:frame", receive);
    },
  };
}
