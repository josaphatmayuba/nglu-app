import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  onRealtimeEvent,
  onRealtimeStatusChange,
  onRealtimeStaleChange,
  isRealtimeConnected,
  isRealtimeStale,
  stopRealtimeClient,
} from "./realtimeClient";

// Reset module state between tests
beforeEach(() => {
  stopRealtimeClient();
});

afterEach(() => {
  stopRealtimeClient();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// onRealtimeEvent — data.updated triggers the registered handler
// ---------------------------------------------------------------------------

describe("onRealtimeEvent", () => {
  it("calls handler when a matching event is dispatched via BroadcastChannel", async () => {
    const received = [];
    onRealtimeEvent("data.updated", (e) => received.push(e));

    const data = { type: "data.updated", entity: "property", action: "created", entityId: 1 };
    const bc = new BroadcastChannel("nglu-realtime");
    bc.postMessage({ type: "realtime-event", event: data });

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0].entity).toBe("property");
    expect(received[0].action).toBe("created");
    bc.close();
  });

  it("does not call handler for a different event type", async () => {
    const received = [];
    onRealtimeEvent("data.updated", (e) => received.push(e));

    const bc = new BroadcastChannel("nglu-realtime");
    bc.postMessage({ type: "realtime-event", event: { type: "permissions.updated", roleId: 1 } });

    // Allow any pending microtasks to resolve
    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(0);
    bc.close();
  });

  it("unsubscribe prevents handler from being called", async () => {
    const received = [];
    const unsub = onRealtimeEvent("data.updated", (e) => received.push(e));
    unsub();

    const bc = new BroadcastChannel("nglu-realtime");
    bc.postMessage({ type: "realtime-event", event: { type: "data.updated", entity: "unit", entityId: 2 } });

    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(0);
    bc.close();
  });

  it("delivers to multiple handlers for the same event type", async () => {
    const a = [];
    const b = [];
    onRealtimeEvent("data.updated", (e) => a.push(e));
    onRealtimeEvent("data.updated", (e) => b.push(e));

    const bc = new BroadcastChannel("nglu-realtime");
    bc.postMessage({ type: "realtime-event", event: { type: "data.updated", entity: "lease", entityId: 10 } });

    await vi.waitFor(() => expect(a).toHaveLength(1));
    expect(b).toHaveLength(1);
    bc.close();
  });
});

// ---------------------------------------------------------------------------
// Debounce — rapid-fire events are coalesced
// ---------------------------------------------------------------------------

describe("debounce", () => {
  it("coalesces multiple rapid events into one call after the debounce window", async () => {
    vi.useFakeTimers();
    const received = [];
    onRealtimeEvent("data.updated", (e) => received.push(e), { debounceMs: 100 });

    const bc = new BroadcastChannel("nglu-realtime");
    const base = { type: "data.updated", entity: "property" };

    // Dispatch 3 events in sequence — BroadcastChannel in jsdom delivers via setTimeout(0)
    bc.postMessage({ type: "realtime-event", event: { ...base, entityId: 1 } });
    bc.postMessage({ type: "realtime-event", event: { ...base, entityId: 2 } });
    bc.postMessage({ type: "realtime-event", event: { ...base, entityId: 3 } });

    // Let jsdom deliver BroadcastChannel messages (setTimeout 0) and debounce reset each time
    await vi.runAllTimersAsync();

    // Only the last event should have been delivered (debounce coalesces)
    expect(received).toHaveLength(1);
    expect(received[0].entityId).toBe(3);
    bc.close();
  });

  it("calls handler immediately when debounceMs is 0 (default)", async () => {
    const received = [];
    onRealtimeEvent("data.updated", (e) => received.push(e));

    const bc = new BroadcastChannel("nglu-realtime");
    bc.postMessage({ type: "realtime-event", event: { type: "data.updated", entityId: 99 } });

    await vi.waitFor(() => expect(received).toHaveLength(1));
    bc.close();
  });

  it("cancels pending debounce on unsubscribe", async () => {
    vi.useFakeTimers();
    const received = [];
    const unsub = onRealtimeEvent("data.updated", (e) => received.push(e), { debounceMs: 200 });

    const bc = new BroadcastChannel("nglu-realtime");
    bc.postMessage({ type: "realtime-event", event: { type: "data.updated", entityId: 1 } });

    // Advance just enough for jsdom to deliver the BroadcastChannel message (setTimeout 0),
    // but NOT enough to fire the 200ms debounce timer
    await vi.advanceTimersByTimeAsync(10);

    unsub(); // cancel before the 200ms debounce fires
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toHaveLength(0);
    bc.close();
  });
});

// ---------------------------------------------------------------------------
// BroadcastChannel — cross-tab propagation
// ---------------------------------------------------------------------------

describe("BroadcastChannel cross-tab propagation", () => {
  it("events posted on the channel are received by onRealtimeEvent subscribers", async () => {
    const received = [];
    onRealtimeEvent("data.updated", (e) => received.push(e));

    const senderTab = new BroadcastChannel("nglu-realtime");
    senderTab.postMessage({
      type: "realtime-event",
      event: { type: "data.updated", entity: "unit", entityId: 7 },
    });

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0].entity).toBe("unit");
    senderTab.close();
  });

  it("ignores messages with wrong type prefix", async () => {
    const received = [];
    onRealtimeEvent("data.updated", (e) => received.push(e));

    const senderTab = new BroadcastChannel("nglu-realtime");
    senderTab.postMessage({ type: "something-else", payload: {} });

    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(0);
    senderTab.close();
  });
});

// ---------------------------------------------------------------------------
// Stale marking — page visibility
// ---------------------------------------------------------------------------

describe("stale marking", () => {
  it("isRealtimeStale() returns false initially", () => {
    expect(isRealtimeStale()).toBe(false);
  });

  it("onRealtimeStaleChange fires immediately with current state", () => {
    const states = [];
    const unsub = onRealtimeStaleChange((s) => states.push(s));
    expect(states).toEqual([{ stale: false }]);
    unsub();
  });

  it("notifies stale listeners when tab becomes hidden", () => {
    const states = [];
    const unsub = onRealtimeStaleChange((s) => states.push(s.stale));

    // Simulate tab hidden
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(states).toContain(true);
    expect(isRealtimeStale()).toBe(true);

    // Restore
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    unsub();
  });

  it("marks stale=false when tab becomes visible again", () => {
    const states = [];
    const unsub = onRealtimeStaleChange((s) => states.push(s.stale));

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(states.at(-1)).toBe(false);
    expect(isRealtimeStale()).toBe(false);
    unsub();
  });
});

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

describe("isRealtimeConnected", () => {
  it("returns false before connecting", () => {
    expect(isRealtimeConnected()).toBe(false);
  });

  it("onRealtimeStatusChange fires immediately with current status", () => {
    const statuses = [];
    const unsub = onRealtimeStatusChange((s) => statuses.push(s.connected));
    expect(statuses).toEqual([false]);
    unsub();
  });
});
