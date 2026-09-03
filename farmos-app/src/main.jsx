import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { startOutboxWorker } from "./offline-outbox";
import { startFarmosRealtime } from "./farmos-realtime";
import { bootstrapAuth } from "./auth.jsx";
import { cleanupLegacyFarmosApiServiceWorker } from "./service-worker-migration";

class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("FarmOS crash:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <pre style={{ padding: 24, color: "#7A1D1D", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
          FarmOS error:{"\n"}{String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}
        </pre>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", (e) => {
  const root = document.getElementById("root");
  if (root && !root.hasChildNodes()) {
    const pre = document.createElement("pre");
    pre.style.cssText = "padding:24px;color:#7A1D1D;white-space:pre-wrap;font:12px ui-monospace,monospace";
    pre.textContent = `window error: ${e?.error?.stack || e.message}`;
    root.replaceChildren(pre);
  }
});

async function boot() {
  const reloadingForSwCleanup = await cleanupLegacyFarmosApiServiceWorker();
  if (reloadingForSwCleanup) return;

  // SCRUM-119 — restaure le token en mémoire (cookie refresh) avant le rendu.
  await bootstrapAuth();

  startOutboxWorker();
  startFarmosRealtime();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary><App /></ErrorBoundary>
  );
}

boot();
