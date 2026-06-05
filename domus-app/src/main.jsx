import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { bootstrapAuth } from "./auth.jsx";
import "./styles/app.css";

class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("Domus crash:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <pre
          style={{
            padding: 24,
            color: "#9f1239",
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
          }}
        >
          Domus error:{"\n"}
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
    root.innerHTML = `<pre style="padding:24px;color:#9f1239;white-space:pre-wrap;font:12px ui-monospace,monospace">window error: ${
      e?.error?.stack || e.message
    }</pre>`;
  }
});

// SCRUM-119 — restaure le token en mémoire (cookie refresh) avant le rendu,
// pour éviter une rafale de 401 et un flash de l'écran de connexion au reload.
bootstrapAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
});
