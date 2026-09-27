import React from "react";

// ─── Avatar animal : tête 2D plate + boucle d'oreille numérotée ──────────
// Dessin repris à l'identique de la maquette validée (viewBox 0..120).
// La boucle jaune est posée sur l'oreille DROITE de l'animal (= côté GAUCHE
// à l'écran). Numéro de boucle = tagNumber (unique par bâtiment, cf backend
// nextFreeTagNumber). NULL => boucle vide (animal sans bâtiment).

const TAG_YELLOW = "#F2C230";

// Luminance perçue -> texte noir ou blanc selon le fond.
function textColorFor(bgHex) {
  const hex = String(bgHex || TAG_YELLOW).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#2A2200" : "#FFFFFF";
}

// ─── Têtes par espèce ────────────────────────────────────────────────────
function HeadPig() {
  return (
    <>
      <path d="M30 40 L22 8 L52 27 Z" fill="#F4A7B9" stroke="#C9738A" strokeWidth="1" />
      <path d="M32 34 L27 16 L45 28 Z" fill="#E88CA3" />
      <path d="M90 40 L98 8 L68 27 Z" fill="#F4A7B9" stroke="#C9738A" strokeWidth="1" />
      <path d="M88 34 L93 16 L75 28 Z" fill="#E88CA3" />
      <ellipse cx="60" cy="64" rx="40" ry="36" fill="#F7B9C8" stroke="#D98AA0" strokeWidth="1" />
      <ellipse cx="36" cy="74" rx="7" ry="4" fill="#F28DA6" opacity="0.5" />
      <ellipse cx="84" cy="74" rx="7" ry="4" fill="#F28DA6" opacity="0.5" />
      <circle cx="46" cy="56" r="4.2" fill="#2B2226" />
      <circle cx="74" cy="56" r="4.2" fill="#2B2226" />
      <circle cx="47.3" cy="54.6" r="1.3" fill="#ffffff" />
      <circle cx="75.3" cy="54.6" r="1.3" fill="#ffffff" />
      <ellipse cx="60" cy="79" rx="17" ry="12" fill="#EE93A9" stroke="#D0768F" strokeWidth="1" />
      <ellipse cx="54" cy="79" rx="3" ry="4.6" fill="#A94F68" />
      <ellipse cx="66" cy="79" rx="3" ry="4.6" fill="#A94F68" />
    </>
  );
}

function HeadCow() {
  return (
    <>
      <path d="M42 30 Q30 10 18 15 Q30 20 40 36 Z" fill="#EFE3C8" stroke="#BFAF8C" strokeWidth="1" />
      <path d="M78 30 Q90 10 102 15 Q90 20 80 36 Z" fill="#EFE3C8" stroke="#BFAF8C" strokeWidth="1" />
      <ellipse cx="18" cy="46" rx="16" ry="8" transform="rotate(-18 18 46)" fill="#7A4E2D" />
      <ellipse cx="19" cy="46" rx="10" ry="4" transform="rotate(-18 18 46)" fill="#E6B7A2" />
      <ellipse cx="102" cy="46" rx="16" ry="8" transform="rotate(18 102 46)" fill="#7A4E2D" />
      <ellipse cx="101" cy="46" rx="10" ry="4" transform="rotate(18 102 46)" fill="#E6B7A2" />
      <ellipse cx="60" cy="58" rx="30" ry="35" fill="#7A4E2D" />
      <path d="M60 26 C51 40 53 60 60 72 C67 60 69 40 60 26 Z" fill="#F6F0E4" />
      <circle cx="45" cy="54" r="4.2" fill="#1B1412" />
      <circle cx="75" cy="54" r="4.2" fill="#1B1412" />
      <circle cx="46.2" cy="52.6" r="1.3" fill="#ffffff" />
      <circle cx="76.2" cy="52.6" r="1.3" fill="#ffffff" />
      <ellipse cx="60" cy="88" rx="24" ry="15" fill="#E6B7A2" />
      <ellipse cx="51" cy="88" rx="3.5" ry="5" fill="#8B5A4A" />
      <ellipse cx="69" cy="88" rx="3.5" ry="5" fill="#8B5A4A" />
    </>
  );
}

function HeadGoat() {
  return (
    <>
      <path d="M50 30 Q42 8 30 11 Q41 16 45 34 Z" fill="#9C8F80" />
      <path d="M70 30 Q78 8 90 11 Q79 16 75 34 Z" fill="#9C8F80" />
      <ellipse cx="25" cy="52" rx="17" ry="7" transform="rotate(22 25 52)" fill="#E2D5BF" stroke="#C4B294" strokeWidth="1" />
      <ellipse cx="95" cy="52" rx="17" ry="7" transform="rotate(-22 95 52)" fill="#E2D5BF" stroke="#C4B294" strokeWidth="1" />
      <ellipse cx="60" cy="58" rx="24" ry="32" fill="#EDE3D2" stroke="#C9B89B" strokeWidth="1" />
      <ellipse cx="60" cy="81" rx="15" ry="10" fill="#D8C7B0" />
      <path d="M53 88 Q60 114 67 88 Z" fill="#CDBBA0" />
      <circle cx="49" cy="54" r="4.6" fill="#C9A227" />
      <circle cx="71" cy="54" r="4.6" fill="#C9A227" />
      <rect x="46" y="53" width="6" height="2.2" rx="1" fill="#1B1412" />
      <rect x="68" y="53" width="6" height="2.2" rx="1" fill="#1B1412" />
      <ellipse cx="55.5" cy="82" rx="2" ry="3" fill="#8B6F5A" />
      <ellipse cx="64.5" cy="82" rx="2" ry="3" fill="#8B6F5A" />
    </>
  );
}

function HeadSheep() {
  return (
    <>
      <circle cx="60" cy="34" r="17" fill="#F3EEE4" />
      <circle cx="40" cy="42" r="14" fill="#F3EEE4" />
      <circle cx="80" cy="42" r="14" fill="#F3EEE4" />
      <circle cx="36" cy="60" r="11" fill="#EDE6D9" />
      <circle cx="84" cy="60" r="11" fill="#EDE6D9" />
      <ellipse cx="28" cy="58" rx="15" ry="6" transform="rotate(14 28 58)" fill="#3B3230" />
      <ellipse cx="92" cy="58" rx="15" ry="6" transform="rotate(-14 92 58)" fill="#3B3230" />
      <ellipse cx="60" cy="66" rx="22" ry="29" fill="#3B3230" />
      <circle cx="51" cy="40" r="9" fill="#F8F4EC" />
      <circle cx="60" cy="36" r="10" fill="#FBF8F2" />
      <circle cx="69" cy="40" r="9" fill="#F8F4EC" />
      <circle cx="51" cy="60" r="4.2" fill="#ffffff" />
      <circle cx="69" cy="60" r="4.2" fill="#ffffff" />
      <circle cx="51.6" cy="60.6" r="2.2" fill="#1B1412" />
      <circle cx="69.6" cy="60.6" r="2.2" fill="#1B1412" />
      <ellipse cx="56" cy="84" rx="2" ry="2.6" fill="#16110F" />
      <ellipse cx="64" cy="84" rx="2" ry="2.6" fill="#16110F" />
    </>
  );
}

function BodyChicken() {
  return (
    <>
      <path d="M32 58 Q12 36 22 26 Q32 40 40 50 Z" fill="#7C3F18" />
      <path d="M34 62 Q18 48 26 38 Q34 50 42 56 Z" fill="#9C5626" />
      <line x1="52" y1="84" x2="49" y2="106" stroke="#E3A21A" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="68" y1="84" x2="71" y2="106" stroke="#E3A21A" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M42 107 H56 M64 107 H78" stroke="#E3A21A" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="58" cy="64" rx="30" ry="24" fill="#C9773B" />
      <ellipse cx="54" cy="66" rx="16" ry="10" fill="#9C5626" opacity="0.8" />
      <circle cx="84" cy="40" r="13" fill="#C9773B" />
      <path d="M76 30 Q78 20 83 27 Q86 18 90 27 Q95 21 95 31 Z" fill="#D6412F" />
      <path d="M96 38 L107 42 L96 46 Z" fill="#E3A21A" />
      <ellipse cx="94" cy="51" rx="3" ry="5" fill="#D6412F" />
      <circle cx="88" cy="37" r="2.2" fill="#1B1412" />
    </>
  );
}

// Espèce sans dessin dédié : pas de tête, la boucle seule en grand.
function HeadGeneric() {
  return <circle cx="60" cy="60" r="54" fill="#EFE8DA" />;
}

// Position du bouton de la boucle (viewBox 120) + rotation, par espèce.
const TAG_POS = {
  pig: [24, 18, -12],
  cow: [24, 49, 2],
  goat: [24, 58, 2],
  sheep: [24, 60, 2],
};

const HEAD_BY_SPECIES = {
  pig: HeadPig,
  cow: HeadCow,
  goat: HeadGoat,
  sheep: HeadSheep,
  chicken: BodyChicken,
  duck: BodyChicken,
  turkey: BodyChicken,
};

const BIRDS = new Set(["chicken", "duck", "turkey"]);

// Boucle : tige + bouton rond + panneau arrondi, numéro centré en gros.
function EarTag({ tagNumber, tagColor, transform }) {
  const text = tagNumber != null ? String(tagNumber) : "";
  const len = text.length;
  const fontSize = len <= 2 ? 16 : len === 3 ? 12.5 : 10;
  return (
    <g transform={transform}>
      <path
        d="M-4 -3 H4 V3 L15 8 V31 A4 4 0 0 1 11 35 H-11 A4 4 0 0 1 -15 31 V8 L-4 3 Z"
        fill={tagColor}
        stroke="#000000"
        strokeOpacity="0.3"
        strokeWidth="1"
      />
      <circle cx="0" cy="0" r="3" fill="#D8D4CC" stroke="#8C877E" strokeWidth="1" />
      {text && (
        <text
          x="0"
          y="22"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="800"
          fill={textColorFor(tagColor)}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
        >
          {text}
        </text>
      )}
    </g>
  );
}

// Volaille : bague à la patte au lieu d'une boucle d'oreille.
function LegBand({ tagNumber, tagColor }) {
  const text = tagNumber != null ? String(tagNumber) : "";
  return (
    <g>
      <rect x="37" y="88" width="24" height="13" rx="2.5" fill={tagColor} stroke="#000000" strokeOpacity="0.3" strokeWidth="1" />
      {text && (
        <text
          x="49"
          y="94.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={text.length <= 2 ? 10 : 7.5}
          fontWeight="800"
          fill={textColorFor(tagColor)}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
        >
          {text}
        </text>
      )}
    </g>
  );
}

function TagFor({ species, tagNumber, tagColor, isSmall }) {
  if (BIRDS.has(species)) return <LegBand tagNumber={tagNumber} tagColor={tagColor} />;
  const pos = TAG_POS[species];
  if (!pos) {
    return <EarTag tagNumber={tagNumber} tagColor={tagColor} transform="translate(60 18) scale(2.2)" />;
  }
  const scale = isSmall ? 1.45 : 1.25;
  return (
    <EarTag
      tagNumber={tagNumber}
      tagColor={tagColor}
      transform={`translate(${pos[0]} ${pos[1]}) rotate(${pos[2]}) scale(${scale})`}
    />
  );
}

// Fonds pastel par espèce (maquette validée) — utilisés quand l'appelant
// ne fournit pas de accentBg explicite.
const PASTEL_BG = {
  pig: "#F6E7E2",
  cow: "#E4ECF4",
  goat: "#EFE9DA",
  sheep: "#ECE6EF",
  chicken: "#F3EBDD",
  duck: "#F3EBDD",
  turkey: "#F3EBDD",
};

const AnimalAvatarBase = ({
  species,
  tagNumber = null,
  tagColor = TAG_YELLOW,
  size = 64,
  photoUrl,
  title,
  accentBg,
  deceasedOrSold = false,
}) => {
  const Head = HEAD_BY_SPECIES[species] || HeadGeneric;
  const isSmall = size < 64;
  const bg = accentBg || PASTEL_BG[species] || "#EFE8DA";
  const label = title || `${species || "animal"}${tagNumber != null ? ` · boucle ${tagNumber}` : ""}`;

  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: size >= 80 ? 20 : size >= 40 ? 10 : 8,
        background: photoUrl ? `center/cover no-repeat url(${photoUrl})` : bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
        filter: deceasedOrSold ? "grayscale(1)" : "none",
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 120 120"
        width="100%"
        height="100%"
        style={photoUrl ? { position: "absolute", inset: 0, pointerEvents: "none" } : { display: "block" }}
      >
        {!photoUrl && <Head />}
        {(!photoUrl || tagNumber != null) && (
          <TagFor species={species} tagNumber={tagNumber} tagColor={tagColor} isSmall={isSmall} />
        )}
      </svg>
    </div>
  );
};

export const AnimalAvatar = React.memo(AnimalAvatarBase);
export default AnimalAvatar;
