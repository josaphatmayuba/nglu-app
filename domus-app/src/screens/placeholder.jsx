import { Hammer, ExternalLink } from "lucide-react";

export function Placeholder({ title, story }) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">Domus</div>
        <h2 className="title">{title}</h2>
      </div>
      <div className="card empty-state">
        <div className="brand-logo" style={{ margin: "0 auto 14px" }}><Hammer size={18} color="#fff" /></div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Ecran en cours de construction</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          La maquette de cet ecran est validee. L'implementation cablee sur l'API arrive
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
