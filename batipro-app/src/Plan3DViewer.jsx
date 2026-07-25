import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Bounds, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ────────────────────────────────────────────────────────────────────────
   Génération de la géométrie d'un bâtiment à partir du modèle paramétrique.
   Unités = mètres (model.unit). Plan en X/Y (origine coin bas-gauche), Y du
   modèle mappé sur l'axe Z de Three.js (le sol), l'altitude sur l'axe Y (haut).
   Les murs sont SEGMENTÉS autour des ouvertures (linteau + allège + jambages)
   pour percer portes/fenêtres sans CSG — meilleure perf mobile.
   ──────────────────────────────────────────────────────────────────────── */

const num = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d; };

// Retourne les segments pleins (box) d'un mur, en tenant compte des ouvertures.
function wallBoxes(wall, openings) {
  const x1 = num(wall.x1), y1 = num(wall.y1), x2 = num(wall.x2), y2 = num(wall.y2);
  const th = num(wall.thickness, 0.2), h = num(wall.height, 2.8);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 0.001;
  const angle = Math.atan2(dy, dx);
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;

  const wallOpenings = (openings || [])
    .filter((o) => o.wallId === wall.id)
    .map((o) => ({ off: num(o.offset), w: num(o.width, 0.9), h: num(o.height, 2.1), sill: num(o.sill, o.type === "window" ? 1.0 : 0) }))
    .sort((a, b) => a.off - b.off);

  // Chaque segment est décrit dans le repère local du mur (u = position le long,
  // longueur du segment, y0 = base, hauteur), puis transformé en position monde.
  const segs = [];
  if (!wallOpenings.length) {
    segs.push({ u: len / 2, l: len, y0: 0, sh: h });
  } else {
    let cursor = 0;
    for (const o of wallOpenings) {
      const start = Math.max(0, o.off - o.w / 2);
      const end = Math.min(len, o.off + o.w / 2);
      if (start > cursor) segs.push({ u: (cursor + start) / 2, l: start - cursor, y0: 0, sh: h }); // plein avant l'ouverture
      if (o.sill > 0) segs.push({ u: (start + end) / 2, l: end - start, y0: 0, sh: o.sill }); // allège (sous fenêtre)
      const top = o.sill + o.h;
      if (top < h) segs.push({ u: (start + end) / 2, l: end - start, y0: top, sh: h - top }); // linteau (au-dessus)
      cursor = Math.max(cursor, end);
    }
    if (cursor < len) segs.push({ u: (cursor + len) / 2, l: len - cursor, y0: 0, sh: h });
  }

  return segs.filter((s) => s.l > 0.01 && s.sh > 0.01).map((s, i) => {
    // position le long du mur : décalage depuis le début (u) rapporté au centre
    const along = s.u - len / 2;
    const px = cx + Math.cos(angle) * along;
    const pz = cy + Math.sin(angle) * along;
    return { key: `${wall.id}-${i}`, len: s.l, th, height: s.sh, angle, x: px, z: pz, y: s.y0 + s.sh / 2 };
  });
}

// Emprise (bbox) d'un niveau à partir de ses pièces — sert au toit et au cadrage.
function levelFootprint(geometry) {
  const rooms = geometry?.rooms || [];
  if (!rooms.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rooms) {
    minX = Math.min(minX, num(r.x)); minY = Math.min(minY, num(r.y));
    maxX = Math.max(maxX, num(r.x) + num(r.w)); maxY = Math.max(maxY, num(r.y) + num(r.l));
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, l: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function Wall({ box, color, opacity }) {
  return (
    <mesh position={[box.x, box.y, box.z]} rotation={[0, -box.angle, 0]} castShadow receiveShadow>
      <boxGeometry args={[box.len, box.height, box.th]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function Floor({ room, elevation, opacity }) {
  const x = num(room.x), y = num(room.y), w = num(room.w), l = num(room.l);
  return (
    <mesh position={[x + w / 2, elevation + 0.02, y + l / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, l]} />
      <meshStandardMaterial color={room.floorColor || "#cbd5e1"} side={THREE.DoubleSide} transparent={opacity < 1} opacity={opacity * 0.9} />
    </mesh>
  );
}

function Roof({ footprint, elevation, type, opacity }) {
  if (!footprint || type === "none") return null;
  const { cx, cy, w, l } = footprint;
  if (type === "flat") {
    return (
      <mesh position={[cx, elevation + 0.05, cy]} castShadow>
        <boxGeometry args={[w + 0.3, 0.15, l + 0.3]} />
        <meshStandardMaterial color="#94a3b8" transparent={opacity < 1} opacity={opacity} />
      </mesh>
    );
  }
  // gable / hip : prisme triangulaire simple (faîtage le long de la plus grande dimension)
  const ridge = Math.min(w, l) * 0.4;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.2, 0);
  shape.lineTo(w / 2 + 0.2, 0);
  shape.lineTo(0, ridge);
  shape.closePath();
  return (
    <mesh position={[cx, elevation, cy - l / 2 - 0.1]} rotation={[0, 0, 0]}>
      <extrudeGeometry args={[shape, { depth: l + 0.2, bevelEnabled: false }]} />
      <meshStandardMaterial color="#f59e0b" transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function LevelGroup({ level, model, index, count, isolatedIndex, exploded }) {
  const geometry = level.geometry || {};
  const walls = geometry.walls || [];
  const openings = geometry.openings || [];
  const rooms = geometry.rooms || [];
  const footprint = levelFootprint(geometry);
  const baseElevation = num(level.elevation, index * num(model.storeyHeight, 2.8));
  const explodeGap = exploded ? index * 2.2 : 0;
  const elevation = baseElevation + explodeGap;

  const isTop = index === count - 1;
  const dimmed = isolatedIndex != null && isolatedIndex !== index;
  const opacity = dimmed ? 0.12 : 1;

  const boxes = React.useMemo(() => walls.flatMap((w) => wallBoxes(w, openings)), [level]);

  return (
    <group>
      {rooms.map((r) => <Floor key={r.id} room={r} elevation={elevation} opacity={opacity} />)}
      {boxes.map((b) => <Wall key={b.key} box={{ ...b, y: b.y + elevation }} color="#e2e8f0" opacity={opacity} />)}
      {isTop && <Roof footprint={footprint} elevation={elevation + num(level.height, num(model.storeyHeight, 2.8))} type={model.roofType} opacity={opacity} />}
    </group>
  );
}

function Scene({ model, isolatedIndex, exploded }) {
  const levels = model.levels || [];
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.1} castShadow />
      <Bounds fit clip observe margin={1.2}>
        <group>
          {levels.map((lv, i) => (
            <LevelGroup key={lv.id} level={lv} model={model} index={i} count={levels.length} isolatedIndex={isolatedIndex} exploded={exploded} />
          ))}
        </group>
      </Bounds>
      <gridHelper args={[40, 40, "#cbd5e1", "#e5e7eb"]} position={[0, -0.01, 0]} />
      <Environment preset="city" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} minDistance={2} maxDistance={120} />
    </>
  );
}

export default function Plan3DViewer({ model, isolatedIndex, exploded }) {
  const hasGeometry = (model?.levels || []).some((lv) => (lv.geometry?.rooms || []).length || (lv.geometry?.walls || []).length);
  if (!hasGeometry) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13, textAlign: "center", padding: 24 }}>
        Aucune géométrie saisie pour ce plan.<br />Ajoutez des pièces dans l'éditeur pour voir la maquette 3D.
      </div>
    );
  }
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [12, 12, 16], fov: 45 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#eef2ff"]} />
      <Scene model={model} isolatedIndex={isolatedIndex} exploded={exploded} />
    </Canvas>
  );
}
