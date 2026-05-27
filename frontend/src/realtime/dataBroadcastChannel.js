const CHANNEL_NAME = "data-updates";

export function createDataBroadcastChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

export function broadcastDataUpdated(event) {
  const channel = createDataBroadcastChannel();
  if (!channel) return;
  try {
    channel.postMessage({
      type: "data.updated",
      event,
      sentAt: Date.now(),
    });
  } finally {
    channel.close();
  }
}
