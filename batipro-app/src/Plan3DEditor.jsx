import React from "react";
import Plan2DView from "./Plan2DView.jsx";

/* ────────────────────────────────────────────────────────────────────────
   Éditeur paramétrique du plan d'un chantier. L'utilisateur saisit des PIÈCES
   (rectangle x/y/largeur/longueur/hauteur) ; les 4 murs de chaque pièce sont
   générés automatiquement. Il peut ensuite poser des ouvertures (porte/fenêtre)
   sur un mur donné. La géométrie complète d'un étage est sauvegardée en JSON.
   ──────────────────────────────────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 9);
const num = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d; };

// Génère les 4 murs périmétriques d'une pièce rectangulaire.
function wallsForRoom(room, thickness, height) {
  const { x, y, w, l } = { x: num(room.x), y: num(room.y), w: num(room.w), l: num(room.l) };
  const h = num(room.h, height);
  const mk = (x1, y1, x2, y2, side) => ({ id: `${room.id}-${side}`, x1, y1, x2, y2, thickness, height: h, roomId: room.id });
  return [
    mk(x, y, x + w, y, "s"),
    mk(x + w, y, x + w, y + l, "e"),
    mk(x + w, y + l, x, y + l, "n"),
    mk(x, y + l, x, y, "w"),
  ];
}

// Reconstruit la géométrie (rooms + walls dérivés + openings conservées) d'un étage.
function buildGeometry(rooms, openings, thickness, storeyHeight) {
  const walls = rooms.flatMap((r) => wallsForRoom(r, thickness, storeyHeight));
  const wallIds = new Set(walls.map((w) => w.id));
  return { rooms, walls, openings: (openings || []).filter((o) => wallIds.has(o.wallId)) };
}

function Num({ label, value, onChange, step = "0.1", min }) {
  return (
    <label className="field" style={{ minWidth: 0 }}>
      <span>{label}</span>
      <input type="number" step={step} min={min} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function Plan3DEditor({ level, model, busy, onSaveLevel, overlayUrl }) {
  const g = level.geometry || {};
  const [rooms, setRooms] = React.useState(() => g.rooms || []);
  const [openings, setOpenings] = React.useState(() => g.openings || []);
  const [dirty, setDirty] = React.useState(false);
  const [overlayOn, setOverlayOn] = React.useState(true);
  const [overlayOpacity, setOverlayOpacity] = React.useState(0.5);

  React.useEffect(() => {
    setRooms((level.geometry || {}).rooms || []);
    setOpenings((level.geometry || {}).openings || []);
    setDirty(false);
  }, [level.id]);

  const thickness = 0.2;
  const storeyHeight = num(model.storeyHeight, 2.8);

  const patchRoom = (id, k, v) => { setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r))); setDirty(true); };
  const addRoom = () => { setRooms((rs) => [...rs, { id: uid(), name: `Pièce ${rs.length + 1}`, x: 0, y: 0, w: 4, l: 3, h: storeyHeight }]); setDirty(true); };
  const removeRoom = (id) => { setRooms((rs) => rs.filter((r) => r.id !== id)); setOpenings((os) => os.filter((o) => !o.wallId.startsWith(id))); setDirty(true); };

  const patchOpening = (id, k, v) => { setOpenings((os) => os.map((o) => (o.id === id ? { ...o, [k]: v } : o))); setDirty(true); };
  const addOpening = () => {
    const walls = rooms.flatMap((r) => wallsForRoom(r, thickness, storeyHeight));
    if (!walls.length) return;
    setOpenings((os) => [...os, { id: uid(), wallId: walls[0].id, type: "door", offset: 1, width: 0.9, height: 2.1, sill: 0 }]);
    setDirty(true);
  };
  const removeOpening = (id) => { setOpenings((os) => os.filter((o) => o.id !== id)); setDirty(true); };

  const wallOptions = React.useMemo(() => {
    return rooms.flatMap((r) => {
      const sides = { s: "sud", e: "est", n: "nord", w: "ouest" };
      return ["s", "e", "n", "w"].map((side) => ({ id: `${r.id}-${side}`, label: `${r.name || "Pièce"} — ${sides[side]}` }));
    });
  }, [rooms]);

  const save = () => {
    const geometry = buildGeometry(rooms, openings, thickness, storeyHeight);
    onSaveLevel(level.id, geometry);
    setDirty(false);
  };

  // Aperçu live : la géométrie telle qu'elle sera rendue, superposée au plan importé.
  const previewLevel = { geometry: buildGeometry(rooms, openings, thickness, storeyHeight) };

  return (
    <div>
      {/* Aperçu 2D de l'étage, avec le plan de l'architecte en fond (calque) si importé */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <p className="kv-title" style={{ margin: 0 }}>Aperçu {overlayUrl ? "(calque sur le plan importé)" : ""}</p>
          {overlayUrl && (
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input type="checkbox" checked={overlayOn} onChange={(e) => setOverlayOn(e.target.checked)} /> Fond plan
              </label>
              {overlayOn && <input type="range" min="0.1" max="1" step="0.1" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} title="Opacité du fond" />}
            </span>
          )}
        </div>
        <div style={{ position: "relative", height: 320, border: "1px solid var(--ink-100)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          {overlayUrl && overlayOn && (
            <img src={overlayUrl} alt="Plan importé" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: overlayOpacity, pointerEvents: "none" }} />
          )}
          <div style={{ position: "absolute", inset: 0 }}>
            <Plan2DView level={previewLevel} transparent={overlayUrl && overlayOn} />
          </div>
        </div>
        {overlayUrl && <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Ajustez les coordonnées des pièces ci-dessous pour les caler sur le plan importé.</p>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p className="kv-title" style={{ margin: 0 }}>Pièces de l'étage</p>
        <button className="btn btn-ghost" type="button" onClick={addRoom}>+ Pièce</button>
      </div>
      {!rooms.length ? (
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Aucune pièce. Ajoutez-en une pour dessiner l'étage (murs générés automatiquement).</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {rooms.map((r) => (
            <div className="card pad" key={r.id} style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(5, .7fr) auto", gap: 8, alignItems: "end" }}>
              <label className="field" style={{ minWidth: 0 }}><span>Nom</span><input value={r.name || ""} onChange={(e) => patchRoom(r.id, "name", e.target.value)} /></label>
              <Num label="X (m)" value={r.x} onChange={(v) => patchRoom(r.id, "x", v)} />
              <Num label="Y (m)" value={r.y} onChange={(v) => patchRoom(r.id, "y", v)} />
              <Num label="Larg." value={r.w} onChange={(v) => patchRoom(r.id, "w", v)} min="0.5" />
              <Num label="Long." value={r.l} onChange={(v) => patchRoom(r.id, "l", v)} min="0.5" />
              <Num label="Haut." value={r.h ?? storeyHeight} onChange={(v) => patchRoom(r.id, "h", v)} min="1" />
              <button className="icon-btn" type="button" title="Supprimer" onClick={() => removeRoom(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p className="kv-title" style={{ margin: 0 }}>Ouvertures (portes / fenêtres)</p>
        <button className="btn btn-ghost" type="button" onClick={addOpening} disabled={!rooms.length}>+ Ouverture</button>
      </div>
      {!openings.length ? (
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Aucune ouverture. Optionnel — le mur restera plein.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {openings.map((o) => (
            <div className="card pad" key={o.id} style={{ display: "grid", gridTemplateColumns: "1.6fr .9fr repeat(4, .7fr) auto", gap: 8, alignItems: "end" }}>
              <label className="field" style={{ minWidth: 0 }}>
                <span>Mur</span>
                <select value={o.wallId} onChange={(e) => patchOpening(o.id, "wallId", e.target.value)}>
                  {wallOptions.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              </label>
              <label className="field" style={{ minWidth: 0 }}>
                <span>Type</span>
                <select value={o.type} onChange={(e) => patchOpening(o.id, "type", e.target.value)}>
                  <option value="door">Porte</option>
                  <option value="window">Fenêtre</option>
                </select>
              </label>
              <Num label="Pos." value={o.offset} onChange={(v) => patchOpening(o.id, "offset", v)} />
              <Num label="Larg." value={o.width} onChange={(v) => patchOpening(o.id, "width", v)} min="0.3" />
              <Num label="Haut." value={o.height} onChange={(v) => patchOpening(o.id, "height", v)} min="0.3" />
              <Num label="Allège" value={o.sill ?? 0} onChange={(v) => patchOpening(o.id, "sill", v)} />
              <button className="icon-btn" type="button" title="Supprimer" onClick={() => removeOpening(o.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-amber grad-amber" type="button" onClick={save} disabled={busy || !dirty}>
        {busy ? "Enregistrement…" : dirty ? "Enregistrer l'étage" : "Enregistré"}
      </button>
    </div>
  );
}
