import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import SubcontractorSubmit from "./SubcontractorSubmit.jsx";
import ClientDocument from "./ClientDocument.jsx";
import { bootstrapAuth } from "./auth.jsx";
import { mountVersionBadge } from "./version-badge.js";
import "./styles.css";

// Portail sous-traitant public (sans compte) : /batipro/public/submit/:token.
// Detecte avant tout bootstrap auth (aucun JWT requis sur cette page).
const publicMatch = typeof window !== "undefined"
  ? window.location.pathname.match(/\/batipro\/public\/submit\/([^/?#]+)/)
  : null;
// Page publique client (devis) : /batipro/public/document/:token.
const clientDocMatch = typeof window !== "undefined"
  ? window.location.pathname.match(/\/batipro\/public\/document\/([^/?#]+)/)
  : null;

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

if (clientDocMatch) {
  // Page publique client (devis) : pas de bootstrap auth.
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <ClientDocument token={decodeURIComponent(clientDocMatch[1])} />
    </ErrorBoundary>
  );
} else if (publicMatch) {
  // Page publique : pas de bootstrap auth, pas de badge de version interne.
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <SubcontractorSubmit token={decodeURIComponent(publicMatch[1])} />
    </ErrorBoundary>
  );
} else {
  // SCRUM-119 — restaure le token en mémoire (cookie refresh) avant le rendu.
  bootstrapAuth().finally(() => {
    ReactDOM.createRoot(document.getElementById("root")).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    mountVersionBadge();
  });
}
