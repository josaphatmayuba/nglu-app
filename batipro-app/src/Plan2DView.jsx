import React from "react";

/* ────────────────────────────────────────────────────────────────────────
   Vue 2D façon plan d'architecte (vu de dessus) d'un étage — SVG, sans Three.js.
   Conventions respectées : murs noirs pleins, portes en arc de débattement,
   fenêtres en triple trait dans le mur, nom + surface m² par pièce, cotes
   extérieures, fond blanc. Léger (chunk séparé, pas de dépendance 3D).
   ──────────────────────────────────────────────────────────────────────── */

const num = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d; };

function bounds(rooms) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rooms) {
    minX = Math.min(minX, num(r.x)); minY = Math.min(minY, num(r.y));
    maxX = Math.max(maxX, num(r.x) + num(r.w)); maxY = Math.max(maxY, num(r.y) + num(r.l));
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  return { minX, minY, maxX, maxY };
}

export default function Plan2DView({ level, transparent = false }) {
  const g = level?.geometry || {};
  const rooms = g.rooms || [];
  const walls = g.walls || [];
  const openings = g.openings || [];

  if (!rooms.length && !walls.length) {
    if (transparent) return null; // en mode calque, ne rien afficher plutôt qu'un message
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13, textAlign: "center", padding: 24 }}>
        Aucune géométrie sur cet étage.<br />Ajoutez des pièces dans l'éditeur.
      </div>
    );
  }

  const b = bounds(rooms);
  const pad = 1.6; // marge pour les cotes (en mètres)
  const vw = (b.maxX - b.minX) + pad * 2;
  const vh = (b.maxY - b.minY) + pad * 2;
  const ox = b.minX - pad, oy = b.minY - pad;
  const X = (x) => x - ox;
  const Y = (y) => y - oy;

  // Repère local d'un mur (direction + normale) pour poser ouvertures/traits.
  const wallFrame = (w) => {
    const x1 = num(w.x1), y1 = num(w.y1), x2 = num(w.x2), y2 = num(w.y2);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len; // le long du mur
    const nx = -uy, ny = ux;                           // normale
    return { x1, y1, x2, y2, len, ux, uy, nx, ny, th: num(w.thickness, 0.2) };
  };

  const openingEls = openings.map((o) => {
    const w = walls.find((ww) => ww.id === o.wallId);
    if (!w) return null;
    const f = wallFrame(w);
    const t = Math.min(f.len, Math.max(0, num(o.offset)));
    const width = num(o.width, 0.9);
    const cxm = f.x1 + f.ux * t, cym = f.y1 + f.uy * t;
    const ax = cxm - f.ux * width / 2, ay = cym - f.uy * width / 2;
    const bx = cxm + f.ux * width / 2, by = cym + f.uy * width / 2;
    const half = f.th / 2 + 0.02;
    return { id: o.id, type: o.type, f, ax, ay, bx, by, cxm, cym, width, half };
  }).filter(Boolean);

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: transparent ? "transparent" : "#ffffff", overflow: "auto" }}>
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width: "100%", height: "100%", maxHeight: "100%" }} preserveAspectRatio="xMidYMid meet">
        {/* remplissage clair des pièces + nom + surface */}
        {rooms.map((r) => {
          const area = (num(r.w) * num(r.l));
          const fs = Math.max(0.22, Math.min(0.42, num(r.w) / 9));
          return (
            <g key={r.id}>
              <rect x={X(num(r.x))} y={Y(num(r.y))} width={num(r.w)} height={num(r.l)} fill={transparent ? "rgba(99,102,241,0.12)" : "#fafafa"} />
              <text x={X(num(r.x)) + num(r.w) / 2} y={Y(num(r.y)) + num(r.l) / 2 - fs * 0.3} fontSize={fs} fill="#1e293b" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "sans-serif", fontWeight: 600 }}>
                {(r.name || "Pièce").toUpperCase()}
              </text>
              <text x={X(num(r.x)) + num(r.w) / 2} y={Y(num(r.y)) + num(r.l) / 2 + fs * 0.9} fontSize={fs * 0.7} fill="#64748b" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "sans-serif" }}>
                {area.toFixed(1).replace(".0", "")} m²
              </text>
            </g>
          );
        })}

        {/* murs : traits noirs pleins épais */}
        {walls.map((w) => (
          <line key={w.id} x1={X(num(w.x1))} y1={Y(num(w.y1))} x2={X(num(w.x2))} y2={Y(num(w.y2))} stroke="#0f172a" strokeWidth={num(w.thickness, 0.2)} strokeLinecap="butt" />
        ))}

        {/* ouvertures : on "casse" le mur (blanc) puis on dessine la convention */}
        {openingEls.map((o) => {
          const { f } = o;
          // masque du mur au droit de l'ouverture
          const maskA = { x: o.ax - f.nx * o.half, y: o.ay - f.ny * o.half };
          return (
            <g key={o.id}>
              <line x1={X(o.ax)} y1={Y(o.ay)} x2={X(o.bx)} y2={Y(o.by)} stroke="#ffffff" strokeWidth={f.th + 0.04} strokeLinecap="butt" />
              {o.type === "window" ? (
                // fenêtre : triple trait fin dans l'épaisseur du mur
                <>
                  <line x1={X(o.ax - f.nx * f.th / 2)} y1={Y(o.ay - f.ny * f.th / 2)} x2={X(o.bx - f.nx * f.th / 2)} y2={Y(o.by - f.ny * f.th / 2)} stroke="#0f172a" strokeWidth={0.03} />
                  <line x1={X(o.ax)} y1={Y(o.ay)} x2={X(o.bx)} y2={Y(o.by)} stroke="#0f172a" strokeWidth={0.03} />
                  <line x1={X(o.ax + f.nx * f.th / 2)} y1={Y(o.ay + f.ny * f.th / 2)} x2={X(o.bx + f.nx * f.th / 2)} y2={Y(o.by + f.ny * f.th / 2)} stroke="#0f172a" strokeWidth={0.03} />
                </>
              ) : (
                // porte : montant + battant + arc de débattement
                <>
                  <line x1={X(o.ax)} y1={Y(o.ay)} x2={X(o.ax + f.nx * o.width)} y2={Y(o.ay + f.ny * o.width)} stroke="#0f172a" strokeWidth={0.04} />
                  <path
                    d={`M ${X(o.ax + f.nx * o.width)} ${Y(o.ay + f.ny * o.width)} A ${o.width} ${o.width} 0 0 1 ${X(o.bx)} ${Y(o.by)}`}
                    fill="none" stroke="#94a3b8" strokeWidth={0.02} strokeDasharray="0.1 0.08"
                  />
                </>
              )}
            </g>
          );
        })}

        {/* cote globale largeur (bas) et hauteur (gauche) */}
        <g stroke="#94a3b8" strokeWidth={0.02} fill="#64748b" style={{ fontFamily: "sans-serif" }}>
          <line x1={X(b.minX)} y1={Y(b.maxY) + 0.8} x2={X(b.maxX)} y2={Y(b.maxY) + 0.8} />
          <text x={X((b.minX + b.maxX) / 2)} y={Y(b.maxY) + 1.15} fontSize={0.3} textAnchor="middle" stroke="none">{(b.maxX - b.minX).toFixed(2)} m</text>
          <line x1={X(b.minX) - 0.8} y1={Y(b.minY)} x2={X(b.minX) - 0.8} y2={Y(b.maxY)} />
          <text x={X(b.minX) - 1.0} y={Y((b.minY + b.maxY) / 2)} fontSize={0.3} textAnchor="middle" stroke="none" transform={`rotate(-90 ${X(b.minX) - 1.0} ${Y((b.minY + b.maxY) / 2)})`}>{(b.maxY - b.minY).toFixed(2)} m</text>
        </g>
      </svg>
    </div>
  );
}
