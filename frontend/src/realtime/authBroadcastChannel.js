const CHANNEL_NAME = "auth-updates";

export function createAuthBroadcastChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

export function broadcastPermissionsUpdated(event) {
  const channel = createAuthBroadcastChannel();
  if (!channel) return;
  try {
    channel.postMessage({
      type: "permissions.updated",
      event,
      sentAt: Date.now(),
    });
  } finally {
    channel.close();
  }
}
