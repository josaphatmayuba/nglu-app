import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { bootstrapAuth } from "./auth.jsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("Migration Cockpit crash:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <pre style={{ padding: 24, color: "#9f1239", whiteSpace: "pre-wrap", font: "12px ui-monospace,monospace" }}>
          {String(this.state.err.stack || this.state.err.message || this.state.err)}
        </pre>
      );
    }
    return this.props.children;
  }
}

// SCRUM-119 — restaure le token (cookie refresh) avant le rendu.
bootstrapAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
});
