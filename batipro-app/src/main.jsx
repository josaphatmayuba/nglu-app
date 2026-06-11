import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { bootstrapAuth } from "./auth.jsx";
import { mountVersionBadge } from "./version-badge.js";
import "./styles.css";

class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("BatiPro crash:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <pre className="fatal-error">
          BatiPro error:{"\n"}{String(this.state.err?.stack || this.state.err?.message || this.state.err)}
        </pre>
      );
    }
    return this.props.children;
  }
}

// SCRUM-119 — restaure le token en mémoire (cookie refresh) avant le rendu.
bootstrapAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  mountVersionBadge();
});
