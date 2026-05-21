/**
 * Maps data.updated event tags to Redux dispatch calls.
 * Only dispatches if the relevant data is currently loaded (avoids unnecessary network calls).
 */

import { loadPropertyManagement } from "../redux/rtk/features/propertyManagement/propertyManagementSlice";

const DEBOUNCE_MS = 600;
const pending = new Map(); // tag → timer

function debounced(tag, fn) {
  if (pending.has(tag)) clearTimeout(pending.get(tag));
  pending.set(tag, setTimeout(() => { pending.delete(tag); fn(); }, DEBOUNCE_MS));
}

/**
 * Call this from a Redux-connected context (e.g., inside a component or middleware).
 * Returns a handler function to pass to onRealtimeEvent("data.updated", handler).
 */
export function createDataUpdateHandler(dispatch) {
  return function handleDataUpdated(event) {
    const tags = event?.tags ?? [];

    if (tags.some((t) => ["propertyManagement", "properties", "units", "leases", "payments", "maintenance"].includes(t))) {
      debounced("propertyManagement", () => dispatch(loadPropertyManagement()));
    }
  };
}
