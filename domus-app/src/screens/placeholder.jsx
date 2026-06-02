import { Hammer, ExternalLink } from "lucide-react";

// Écran en attente d'implémentation (stories suivantes de l'epic Domus, SCRUM-241).
export function Placeholder({ title, story }) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">Domus</div>
        <h2 className="title">{title}</h2>
      </div>
      <div className="card" style={{ padding: 28, textAlign: "center", maxWidth: 520 }}>
        <div className="brand-logo" style={{ margin: "0 auto 14px" }}><Hammer size={18} color="#fff" /></div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Écran en cours de construction</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          La maquette de cet écran est validée. L'implémentation câblée sur l'API arrive
          dans une prochaine story.
        </p>
        {story && (
          <span className="chip chip-iris" style={{ marginTop: 4 }}>
            <ExternalLink size={12} /> {story}
          </span>
        )}
      </div>
    </>
  );
}
