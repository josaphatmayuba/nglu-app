// Logo KodaTill — monogramme K + fente de tiroir-caisse, repris tel quel du
// mockup mockup/KodaTill/KodaTill.html (symbol#logo-kodatill + .grad-leaf).
// Ne pas remplacer par une icone de librairie generique : c'est la marque officielle.
import React from "react";

export const KODATILL_GRADIENT = "linear-gradient(135deg, #45a7ad, #1f6d75)";

// Trait du monogramme seul (sans fond), viewBox 0 0 64 64 — identique au
// symbol#logo-kodatill du mockup.
export const LogoMark = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="14" y="42" width="36" height="10" rx="3" fill="#fff" opacity="0.9" />
    <rect x="20" y="46" width="24" height="2.4" rx="1.2" fill="#1f6d75" />
    <rect x="18" y="12" width="6.5" height="26" rx="2" fill="#fff" />
    <path d="M24.5 24 L36 12 H45 L30 26 Z" fill="#fff" />
    <path d="M24.5 26 L30 26 L45 40 H36 Z" fill="#fff" />
  </svg>
);

// Badge complet (fond degrade teal + monogramme), equivalent du
// `.grad-leaf` + `<use href="#logo-kodatill">` du mockup.
export const Brand = ({ size = 40, radius = 12 }) => (
  <div
    style={{
      width: size, height: size, borderRadius: radius,
      background: KODATILL_GRADIENT,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <LogoMark size={Math.round(size * 0.55)} />
  </div>
);
