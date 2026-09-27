import React from "react";

// ─── Avatar animal : tête 2D plate + boucle d'oreille numérotée ──────────
// Style flat SVG (pas de 3D/Three.js). La boucle jaune est posée sur
// l'oreille DROITE de l'animal (= côté GAUCHE à l'écran, viewBox 0..60 en x).
// Numéro de boucle = tagNumber (unique par bâtiment, cf backend
// nextFreeTagNumber). NULL => boucle vide (animal sans bâtiment).

const TAG_YELLOW = "#F2C230";
const TAG_YELLOW_DARK = "#C89A1E";

// Luminance perçue -> texte noir ou blanc selon le fond (WCAG-ish, simple).
function textColorFor(bgHex) {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1206" : "#ffffff";
}

// ─── Têtes par espèce (traits simplifiés, esprit de la maquette validée) ──
function HeadPig() {
  return (
    <g>
      <circle cx="30" cy="34" r="21" fill="#F3B6B0" />
      <path d="M14 20 L20 8 L26 18 Z" fill="#F3B6B0" />
      <path d="M46 20 L40 8 L34 18 Z" fill="#F3B6B0" />
      <ellipse cx="30" cy="40" rx="10" ry="7" fill="#E88C86" />
      <circle cx="25" cy="40" r="1.8" fill="#8a3d3a" />
      <circle cx="35" cy="40" r="1.8" fill="#8a3d3a" />
      <circle cx="21" cy="27" r="2.2" fill="#4a2a26" />
      <circle cx="39" cy="27" r="2.2" fill="#4a2a26" />
    </g>
  );
}
function HeadCow() {
  return (
    <g>
      <path d="M14 16 Q10 6 16 6 Q18 12 20 16 Z" fill="#EADFC8" />
      <path d="M46 16 Q50 6 44 6 Q42 12 40 16 Z" fill="#EADFC8" />
      <circle cx="30" cy="35" r="20" fill="#8B5E3C" />
      <path d="M22 20 Q30 14 38 20 L36 30 Q30 26 24 30 Z" fill="#F5EFE1" />
      <ellipse cx="30" cy="44" rx="11" ry="8" fill="#E9B7A8" />
      <circle cx="24" cy="44" r="1.7" fill="#5a2f22" />
      <circle cx="36" cy="44" r="1.7" fill="#5a2f22" />
      <circle cx="20" cy="28" r="2.1" fill="#2a1a12" />
      <circle cx="40" cy="28" r="2.1" fill="#2a1a12" />
    </g>
  );
}
function HeadGoat() {
  return (
    <g>
      <path d="M20 12 Q17 2 23 4 Q22 10 24 15 Z" fill="#9c9490" />
      <path d="M40 12 Q43 2 37 4 Q38 10 36 15 Z" fill="#9c9490" />
      <circle cx="30" cy="35" r="19" fill="#EFE6CF" />
      <path d="M28 44 Q30 50 32 44 Z" fill="#C7A96A" />
      <ellipse cx="30" cy="40" rx="7" ry="5" fill="#E4D6AE" />
      <circle cx="21" cy="27" r="2.4" fill="#C08A2E" />
      <circle cx="39" cy="27" r="2.4" fill="#C08A2E" />
    </g>
  );
}
function HeadSheep() {
  return (
    <g>
      <circle cx="30" cy="30" r="22" fill="#EFE7D8" />
      <circle cx="16" cy="20" r="7" fill="#EFE7D8" />
      <circle cx="44" cy="20" r="7" fill="#EFE7D8" />
      <circle cx="12" cy="32" r="6.5" fill="#EFE7D8" />
      <circle cx="48" cy="32" r="6.5" fill="#EFE7D8" />
      <ellipse cx="30" cy="40" rx="11" ry="9" fill="#3D3630" />
      <circle cx="24" cy="39" r="1.6" fill="#EFE7D8" />
      <circle cx="36" cy="39" r="1.6" fill="#EFE7D8" />
    </g>
  );
}
function HeadChicken() {
  return (
    <g>
      <path d="M20 10 Q24 2 28 10 Q24 8 20 10 Z M26 8 Q30 0 34 8 Q30 6 26 8 Z M32 10 Q36 2 40 10 Q36 8 32 10 Z" fill="#C7392B" />
      <circle cx="30" cy="30" r="18" fill="#E0A94A" />
      <path d="M12 32 L4 30 L12 26 Z" fill="#E8B23A" />
      <circle cx="24" cy="28" r="2" fill="#3a2412" />
      <path d="M28 34 L20 38 L28 38 Z" fill="#C7392B" />
    </g>
  );
}
function HeadGeneric() {
  return (
    <g>
      <circle cx="30" cy="32" r="20" fill="#D8CDBE" />
      <circle cx="23" cy="30" r="2" fill="#4a3a2a" />
      <circle cx="37" cy="30" r="2" fill="#4a3a2a" />
      <ellipse cx="30" cy="40" rx="8" ry="5" fill="#C7B79E" />
    </g>
  );
}

const HEAD_BY_SPECIES = {
  pig: HeadPig,
  cow: HeadCow,
  goat: HeadGoat,
  sheep: HeadSheep,
  chicken: HeadChicken,
  duck: HeadChicken,
  turkey: HeadChicken,
};

// Boucle d'oreille : tige + bouton rond + panneau trapézoïdal, posée sur
// l'oreille droite de l'animal (côté gauche de l'écran).
function EarTag({ tagNumber, big, tagColor }) {
  const digits = tagNumber != null ? String(tagNumber).length : 0;
  const fontSize = digits >= 4 ? 11 : digits === 3 ? 13 : 16;
  const fill = tagColor || TAG_YELLOW;
  const stroke = tagColor ? tagColor : TAG_YELLOW_DARK;
  const textColor = textColorFor(fill);
  const scale = big ? 1.45 : 1;
  const cx = 16;
  const cy = 46;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
      {/* tige reliant l'oreille au panneau */}
      <path d="M17 30 L15 42" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      {/* bouton fixateur */}
      <circle cx="17" cy="30" r="2.6" fill={stroke} />
      {/* panneau trapézoïdal */}
      <path
        d="M4 40 L26 40 L23 58 Q22 60 20 60 L10 60 Q8 60 7 58 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {tagNumber != null && (
        <text
          x="15"
          y="53"
          textAnchor="middle"
          fontFamily="'Roboto Mono', 'SFMono-Regular', Consolas, monospace"
          fontWeight="700"
          fontSize={fontSize}
          fill={textColor}
        >
          {tagNumber}
        </text>
      )}
    </g>
  );
}

const AnimalAvatarBase = ({
  species,
  tagNumber = null,
  tagColor,
  size = 64,
  photoUrl,
  title,
  accentBg = "var(--ink-50)",
  deceasedOrSold = false,
}) => {
  const Head = HEAD_BY_SPECIES[species] || HeadGeneric;
  const isSmall = size < 64;
  const label = title || `${species || "animal"}${tagNumber != null ? ` · boucle ${tagNumber}` : ""}`;

  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: size >= 40 ? 12 : 8,
        background: photoUrl ? `center/cover no-repeat url(${photoUrl})` : accentBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
        border: "1px solid var(--border-1)",
        filter: deceasedOrSold ? "grayscale(1)" : "none",
        position: "relative",
      }}
    >
      {!photoUrl && (
        <svg viewBox="0 0 60 60" width="100%" height="100%" style={{ display: "block" }}>
          <Head />
          {isSmall ? (
            tagNumber != null && <EarTag tagNumber={tagNumber} tagColor={tagColor} big />
          ) : (
            <EarTag tagNumber={tagNumber} tagColor={tagColor} />
          )}
        </svg>
      )}
      {photoUrl && tagNumber != null && (
        <svg
          viewBox="0 0 60 60"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <EarTag tagNumber={tagNumber} tagColor={tagColor} big={isSmall} />
        </svg>
      )}
    </div>
  );
};

export const AnimalAvatar = React.memo(AnimalAvatarBase);
export default AnimalAvatar;
