const CODEC2_ASSET_ROOT = `${import.meta.env.BASE_URL}codec2/`;

function codec2WorkletUrl() {
  return `${CODEC2_ASSET_ROOT}codec2-worklet.js`;
}

/**
 * Connects one local microphone to a Codec2 duplex worklet.
 * The worklet emits encoded frames and plays frames received through sendFrame.
 */
export async function createCodec2AudioEngine(stream, { onFrame, onState } = {}) {
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Web Audio is not supported");

  const context = new AudioContextCtor();
  try {
    if (!context.audioWorklet || !globalThis.AudioWorkletNode) {
      throw new Error("AudioWorklet is not supported");
    }

    await context.audioWorklet.addModule(codec2WorkletUrl());
    const source = context.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(context, "codec2-duplex", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    node.port.onmessage = (event) => {
      const message = event.data;
      if (message?.type === "frame") onFrame?.(new Uint8Array(message.frame));
      if (message?.type === "ready") onState?.({ type: "ready", ...message });
      if (message?.type === "error") onState?.({ type: "error", message: message.message });
    };

    source.connect(node);
    // The node output is decoded remote audio, not the local microphone.
    node.connect(context.destination);
    await context.resume();

    let closed = false;
    return {
      context,
      node,
      sendFrame(frame) {
        if (closed) return;
        const copy = frame instanceof Uint8Array ? frame.slice() : new Uint8Array(frame);
        node.port.postMessage({ type: "frame", frame: copy.buffer }, [copy.buffer]);
      },
      async close() {
        if (closed) return;
        closed = true;
        node.port.postMessage({ type: "close" });
        source.disconnect();
        node.disconnect();
        await context.close();
      },
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}
