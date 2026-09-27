/* eslint-disable */
// Indicateurs de chargement non bloquants, par section (styles: public/styles/app.css, section « Loaders », classes fl-*).
//  - Spinner       : anneau inline, couleur = currentColor
//  - SectionLoader : remplace le contenu d'une carte/section en cours de chargement (fondu retardé → pas de clignotement)
//  - RefreshBadge  : petit badge « Mise à jour… » pour un rafraîchissement en arrière-plan
//  - SkeletonRows  : lignes fantômes (shimmer) pour listes/tableaux
import React from "react";

const TXT = {
  fr: { loading: "Chargement…", refresh: "Mise à jour…", aria: "Chargement" },
  en: { loading: "Loading…", refresh: "Updating…", aria: "Loading" },
};
const t = (lang) => TXT[lang === "en" ? "en" : "fr"];

export function Spinner({ size = 16, label }) {
  const stroke = size <= 14 ? 2 : size >= 28 ? 3 : 2.25;
  const r = (size - stroke) / 2;
  const c = size / 2;
  return (
    <svg
      className="fl-spinner"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="status"
      aria-label={label || "Chargement"}
      focusable="false"
    >
      <circle className="fl-spinner-track" cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} />
      <circle
        className="fl-spinner-arc"
        cx={c}
        cy={c}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(2 * Math.PI * r * 0.28).toFixed(2)} ${(2 * Math.PI * r).toFixed(2)}`}
      />
    </svg>
  );
}

// Cochon qui trotte : pattes alternées, corps qui rebondit, herbe qui défile, petits nuages de poussière.
const PIG_LEGS = [
  { x: 21, cls: "b" }, { x: 25.5, cls: "a" }, // arrière
  { x: 39.5, cls: "a" }, { x: 44, cls: "b" }, // avant
];
function PigScene() {
  return (
    <>
      <g className="fl-ground">
        {[0, 18, 36, 54, 72].map((x) => (
          <path key={x} d={`M${x + 4} 40 l1.6 -4 l1.6 4 M${x + 7.5} 40 l1.2 -2.8`} />
        ))}
      </g>
      <circle className="fl-dust" cx="19" cy="38" r="1.8" />
      <circle className="fl-dust fl-dust--late" cx="23" cy="38.5" r="1.4" />
      <g className="fl-pig">
        {PIG_LEGS.map((l) => (
          <rect key={l.x} className={`fl-pig-leg fl-leg-${l.cls}`} x={l.x} y="29" width="3.4" height="10" rx="1.6"
            style={{ transformOrigin: `${l.x + 1.7}px 30px` }} />
        ))}
        <path className="fl-pig-tail" d="M16.8 21.5 q-4.2 -0.6 -3.4 -3.8 q0.9 -2.6 3 -1.2 q1.6 1.4 -0.9 2.6" />
        <ellipse className="fl-pig-body" cx="32" cy="24" rx="16" ry="10.5" />
        <path className="fl-pig-ear" d="M43.6 13 L46.8 7.2 L49.6 13.4 Z" />
        <circle className="fl-pig-body" cx="48" cy="20" r="8.5" />
        <circle className="fl-pig-blush" cx="50.2" cy="23.6" r="1.7" />
        <ellipse className="fl-pig-snout" cx="55.6" cy="21.8" rx="3.4" ry="2.9" />
        <circle className="fl-eye" cx="54.6" cy="21.8" r="0.65" />
        <circle className="fl-eye" cx="56.7" cy="21.8" r="0.65" />
        <circle className="fl-eye fl-blink" cx="49.4" cy="17.4" r="1.25" />
      </g>
    </>
  );
}

// Poule qui picore des grains (les grains disparaissent un à un).
function HenScene() {
  return (
    <>
      <line className="fl-ground-line" x1="0" y1="40" x2="72" y2="40" />
      <circle className="fl-grain" cx="46" cy="38.6" r="1" />
      <circle className="fl-grain fl-grain--2" cx="51" cy="39" r="0.9" />
      <circle className="fl-grain fl-grain--3" cx="56" cy="38.8" r="1" />
      <path className="fl-hen-leg" d="M28 33 v7 M26 40 h4 M33 33 v7 M31 40 h4" />
      <g className="fl-hen">
        <path className="fl-hen-body" d="M19 25 q-6 -9 -2.5 -13 q2.6 5.2 6 6.8 Z" />
        <ellipse className="fl-hen-body" cx="30" cy="26" rx="12" ry="8.8" />
        <ellipse className="fl-hen-wing" cx="28.5" cy="26.6" rx="6.8" ry="4.4" />
        <g className="fl-hen-head">
          <ellipse className="fl-hen-body" cx="39" cy="21.5" rx="4" ry="5" />
          <circle className="fl-hen-body" cx="42" cy="18" r="5.4" />
          <path className="fl-hen-comb" d="M38.6 13.6 q0.8 -3.4 2.6 -1.2 q1 -3.2 2.7 -0.6 q1.8 -2 2.2 1.2 Z" />
          <path className="fl-hen-beak" d="M47 16.8 L51.2 18.6 L47 20.4 Z" />
          <ellipse className="fl-hen-comb" cx="46.4" cy="22.2" rx="1.1" ry="1.7" />
          <circle className="fl-eye fl-blink" cx="43.6" cy="16.8" r="0.95" />
        </g>
      </g>
    </>
  );
}

const SCENES = { pig: PigScene, hen: HenScene };

// Animal tiré au hasard à chaque montage (60 % cochon), ou imposé via `animal="pig"|"hen"`.
function FarmCritter({ animal, label, compact }) {
  const [pick] = React.useState(() => (SCENES[animal] ? animal : Math.random() < 0.6 ? "pig" : "hen"));
  const Scene = SCENES[pick];
  return (
    <svg className={`fl-critter fl-critter--${pick}${compact ? " fl-critter--compact" : ""}`}
      viewBox="0 0 72 44" role="img" aria-label={label} focusable="false">
      <Scene />
    </svg>
  );
}

export function SectionLoader({ lang = "fr", label, minHeight = 96, compact = false, animal }) {
  const tx = t(lang);
  const text = label || tx.loading;
  if (compact) {
    return (
      <div className="fl-section fl-section--compact" role="status" aria-live="polite" aria-busy="true">
        <FarmCritter animal={animal} label={text} compact />
        <span className="fl-section-text">{text}</span>
      </div>
    );
  }
  return (
    <div className="fl-section" style={{ minHeight }} role="status" aria-live="polite" aria-busy="true">
      <FarmCritter animal={animal} label={text} />
      <span className="fl-section-text">{text}</span>
    </div>
  );
}

export function RefreshBadge({ active, lang = "fr" }) {
  if (!active) return null;
  const text = t(lang).refresh;
  return (
    <span className="fl-refresh" aria-live="polite">
      <Spinner size={12} label={text} />
      <span>{text}</span>
    </span>
  );
}

const SK_WIDTHS = [
  ["38%", "22%", "14%"],
  ["52%", "16%", "18%"],
  ["44%", "26%", "10%"],
  ["30%", "20%", "16%"],
];

export function SkeletonRows({ rows = 3 }) {
  return (
    <div className="fl-skeleton" role="status" aria-label="Chargement" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => {
        const w = SK_WIDTHS[i % SK_WIDTHS.length];
        return (
          <div className="fl-skeleton-row" key={i}>
            <span className="fl-sk fl-sk--dot" />
            <span className="fl-sk" style={{ width: w[0] }} />
            <span className="fl-sk" style={{ width: w[1], marginLeft: "auto" }} />
            <span className="fl-sk" style={{ width: w[2] }} />
          </div>
        );
      })}
    </div>
  );
}
