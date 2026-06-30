import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { bootstrapAuth } from "./auth.jsx";
import { mountVersionBadge } from "./version-badge.js";
import "./styles/app.css";

class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Journal crash:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <pre style={{ padding:24, color:"#9f1239", whiteSpace:"pre-wrap", fontFamily:"ui-monospace, monospace", fontSize:12 }}>
          Journal error:{"\n"}
          {String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}
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
    pre.style.cssText = "padding:24px;color:#9f1239;white-space:pre-wrap;font:12px ui-monospace,monospace";
    pre.textContent = `window error: ${e?.error?.stack || e.message}`;
    root.replaceChildren(pre);
  }
});

bootstrapAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
  mountVersionBadge();
});
