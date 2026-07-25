import React from "react";

/* Garde-fou : toute erreur de rendu (WebGL indisponible, crash Three.js, etc.)
   est capturée ici et affiche un fallback au lieu de démonter toute l'app. */
export default class ViewerBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Trace utile en console dev, sans casser l'UI.
    console.error("[BatiPro viewer]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ink-500)", fontSize: 13, textAlign: "center", padding: 24, gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Aperçu 3D indisponible</div>
          <div style={{ color: "var(--ink-400)", maxWidth: 340 }}>
            {this.props.message || "Votre appareil ou navigateur ne permet pas d'afficher la maquette 3D. Utilisez la Vue 2D ou l'éditeur."}
          </div>
          <div style={{ color: "var(--ink-300)", fontSize: 11 }}>{String(this.state.error.message || this.state.error)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
