/* eslint-disable */
// FarmOS icons — Lucide-style line drawings (stroke 1.75) + custom animal silhouettes.
import React from "react";

const Icon = ({ name, size = 18, strokeWidth = 1.75, color = "currentColor" }) => {
  const paths = {
    // UI
    search:    <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus:      <path d="M12 3v18M3 12h18"/>,
    "chevron-left": <path d="m15 18-6-6 6-6"/>,
    minus:     <path d="M3 12h18"/>,
    check:     <path d="M20 7 9 18l-5-5"/>,
    x:         <path d="M18 6 6 18M6 6l12 12"/>,
    chevDown:  <path d="m6 9 6 6 6-6"/>,
    chevRight: <path d="m9 6 6 6-6 6"/>,
    chevLeft:  <path d="m15 6-6 6 6 6"/>,
    arrowRight:<path d="M5 12h14M13 5l7 7-7 7"/>,
    arrowUp:   <path d="M12 19V5M5 12l7-7 7 7"/>,
    arrowDown: <path d="M12 5v14M5 12l7 7 7-7"/>,
    moreH:     <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    moreV:     <><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></>,
    filter:    <path d="M3 5h18l-7 9v6l-4-2v-4z"/>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    bell:      <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    users:     <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/></>,

    // Modules
    dashboard: <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    layers:    <><path d="m12 2-10 6 10 6 10-6z"/><path d="m2 14 10 6 10-6M2 18l10 6 10-6"/></>,
    pulse:     <path d="M3 12h4l3-8 4 16 3-8h4"/>,
    pill:      <><rect x="2.5" y="9.5" width="19" height="5" rx="2.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/></>,
    syringe:   <><path d="m18 2 4 4M21 5l-2.5 2.5M16.5 4.5 4 17v3h3L19.5 7.5zM15 9l1.5 1.5M11 13l1.5 1.5M7 17l1.5 1.5"/></>,
    calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
    package:   <><path d="m3 7 9-4 9 4v10l-9 4-9-4z"/><path d="m3 7 9 4 9-4M12 11v10"/></>,
    wheat:     <><path d="M2 22 22 2M16 8c2 0 4-2 4-4-2 0-4 2-4 4M12 12c2 0 4-2 4-4-2 0-4 2-4 4M8 16c2 0 4-2 4-4-2 0-4 2-4 4M4 20c2 0 4-2 4-4-2 0-4 2-4 4M16 8c0 2 2 4 4 4 0-2-2-4-4-4M12 12c0 2 2 4 4 4 0-2-2-4-4-4M8 16c0 2 2 4 4 4 0-2-2-4-4-4"/></>,
    droplet:   <path d="M12 2.5s7 7 7 12a7 7 0 1 1-14 0c0-5 7-12 7-12z"/>,
    egg:       <path d="M12 3c4 0 7 6 7 11a7 7 0 1 1-14 0c0-5 3-11 7-11z"/>,
    leaf:      <><path d="M5 21c5-2 11-8 14-16-8 1-16 6-16 14 0 1 1 2 2 2z"/><path d="M5 21 14 12"/></>,
    barn:      <><path d="M3 21V10l9-6 9 6v11"/><path d="M3 21h18M9 21v-6h6v6M9 11h6"/></>,
    building:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M10 5V3M14 5V3M8 14h2M14 14h2M8 18h2M14 18h2"/></>,
    chart:     <><path d="M3 3v18h18"/><path d="m7 14 3-3 4 4 5-6"/></>,
    chartBar:  <><rect x="4" y="13" width="3" height="8"/><rect x="10" y="9" width="3" height="12"/><rect x="16" y="5" width="3" height="16"/><path d="M3 21h18"/></>,
    chartPie:  <><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3a7 7 0 0 1 7 7"/></>,
    coins:     <><circle cx="9" cy="10" r="6"/><path d="M9 7v6M7.5 9h3M14.5 14.5a6 6 0 1 1-5-9"/></>,
    report:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
    sparkle:   <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>,
    qr:        <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h2v2M18 14v2h-2M14 18h2v3M18 18h3M21 14v3"/></>,
    flask:     <><path d="M10 2v6L4 20a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-12V2"/><path d="M8 2h8M7 14h10"/></>,
    map:       <><path d="M3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/></>,
    truck:     <><rect x="1.5" y="6" width="13" height="11"/><path d="M14.5 9h4l3 4v4h-7M3 17a2 2 0 1 0 4 0M16 17a2 2 0 1 0 4 0"/></>,
    // Identification module
    camera:    <><path d="M3 8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/></>,
    scanLine:  <><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18"/></>,
    rfid:      <><path d="M2 12a10 10 0 0 1 10-10M2 12a10 10 0 0 0 10 10M22 12a10 10 0 0 1-10 10M22 12a10 10 0 0 0-10-10M5 12a7 7 0 0 1 7-7M5 12a7 7 0 0 0 7 7M19 12a7 7 0 0 1-7 7M19 12a7 7 0 0 0-7-7"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
    flash:     <path d="m13 2-10 12h7l-1 8 10-12h-7z"/>,
    flashOff:  <><path d="m13 2-3 4M3 14h7l-1 8 4-5"/><path d="M3 3l18 18"/></>,
    rotate:    <><path d="M3 8a8 8 0 0 1 13.85-2.5L21 9"/><path d="M21 4v5h-5"/><path d="M21 16a8 8 0 0 1-13.85 2.5L3 15"/><path d="M3 20v-5h5"/></>,
    mic:       <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    gallery:   <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="m21 16-5-5-9 9"/></>,
    nfc:       <><path d="M6 10a6 6 0 0 1 12 0v4a6 6 0 0 1-12 0z"/><path d="M3 8a9 9 0 0 1 18 0v8a9 9 0 0 1-18 0z"/></>,
    location:  <><path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="3"/></>,
    cpu:       <><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></>,
    weight:    <><path d="M5 8h14l-2 13H7zM9 8a3 3 0 1 1 6 0"/></>,
    thermometer:<><path d="M14 4a2 2 0 1 0-4 0v10a4 4 0 1 0 4 0z"/><path d="M12 9v6"/></>,
    flame:     <path d="M12 2s4 3 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4-1 4 2 4 2 0 0-2-2-2-2-2s2-1 2-2z"/>,
    download:  <><path d="M12 3v13M5 11l7 7 7-7M5 21h14"/></>,
    upload:    <><path d="M12 21V8M5 13l7-7 7 7M5 3h14"/></>,
    edit:      <><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/></>,
    trash:     <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></>,
    link:      <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    eye:       <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    globe:     <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
    moon:      <path d="M21 12.5A9 9 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z"/>,
    sun:       <><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M4.5 19.5l2-2M17.5 6.5l2-2"/></>,
    grid:      <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    list:      <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
    clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin:       <path d="M12 17v5M9 2h6l-1 6a4 4 0 0 1 3 4H7a4 4 0 0 1 3-4z"/>,
    shield:    <><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/></>,
    activity:  <path d="M3 12h4l3-9 4 18 3-9h4"/>,
    cart:      <><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 13h12l2-9H6"/></>,
    drop2:     <><path d="M12 2.5s7 7 7 12a7 7 0 1 1-14 0c0-5 7-12 7-12z"/></>,
    refresh:   <><path d="M3 12a9 9 0 0 1 15-6.5L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.5L3 16"/><path d="M3 21v-5h5"/></>,
    book:      <><path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1 0-4h13"/></>,
    play:      <path d="M6 4v16l14-8z"/>,
    pause:     <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    fingerprint: <><path d="M12 3a9 9 0 0 0-9 9c0 4 1 6 2 8M21 12a9 9 0 0 0-15-7M8 21c-1-3-1-6-1-9a5 5 0 0 1 10 0c0 4 1 7 2 9M12 12c0 5 1 8 2 10M16 18c-1-2-1-4-1-6"/></>,
    wallet:    <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/></>,
    skull:     <><path d="M12 2a8 8 0 0 0-8 8c0 2.5 1.2 4.2 2.5 5.2.5.4.5 1 .5 1.6V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.2c0-.6 0-1.2.5-1.6C18.8 14.2 20 12.5 20 10a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.4"/><circle cx="15" cy="11" r="1.4"/><path d="M10 20v2M14 20v2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
};

// ─── Animal silhouettes (simplified, monoline) ───────────────────────────
// Emojis natifs colorés par espèce (rendu "réaliste", cross-plateforme).
const ANIMAL_EMOJI = {
  cow: "🐄", pig: "🐖", chicken: "🐔", fish: "🐟", goat: "🐐",
  sheep: "🐑", rabbit: "🐇", duck: "🦆", turkey: "🦃",
};

const AnimalGlyph = ({ kind, size = 22, color = "currentColor", strokeWidth = 1.6 }) => {
  // Emoji natif si disponible pour l'espèce ; sinon fallback sur le tracé SVG.
  const emoji = ANIMAL_EMOJI[kind];
  if (emoji) {
    return (
      <span
        role="img"
        aria-label={kind}
        style={{ fontSize: size, lineHeight: 1, display: "inline-block", verticalAlign: "middle" }}
      >
        {emoji}
      </span>
    );
  }
  const glyphs = {
    cow: (
      // cow head
      <>
        <path d="M6 10c-2 0-3-2-3-4 2 0 3 1 3 3M18 10c2 0 3-2 3-4-2 0-3 1-3 3"/>
        <path d="M5 12c0-4 3-7 7-7s7 3 7 7v3c0 3-3 5-7 5s-7-2-7-5z"/>
        <circle cx="10" cy="12" r="0.8" fill={color}/>
        <circle cx="14" cy="12" r="0.8" fill={color}/>
        <path d="M9 17h6M10.5 15.5h3"/>
      </>
    ),
    pig: (
      <>
        <ellipse cx="12" cy="13" rx="8" ry="6"/>
        <path d="M6 9 5 6M18 9l1-3"/>
        <ellipse cx="12" cy="14.5" rx="3" ry="2"/>
        <circle cx="11" cy="14.5" r="0.5" fill={color}/>
        <circle cx="13" cy="14.5" r="0.5" fill={color}/>
        <circle cx="9" cy="11" r="0.6" fill={color}/>
        <circle cx="15" cy="11" r="0.6" fill={color}/>
      </>
    ),
    chicken: (
      <>
        <path d="M8 20c-1-2-1-5 0-7s3-3 5-3 4 1 5 3"/>
        <path d="M13 10c0-3 1-5 3-5s3 2 2 4l-1 1"/>
        <path d="M14 5c0-1 1-2 2-2s2 1 1 2"/>
        <circle cx="16" cy="7.5" r="0.6" fill={color}/>
        <path d="M17 9l2 1M18 11l2 0M8 20h10"/>
      </>
    ),
    fish: (
      <>
        <path d="M3 12c2-4 6-6 10-6s7 2 8 6c-1 4-4 6-8 6s-8-2-10-6z"/>
        <path d="m21 12 2-3v6z"/>
        <circle cx="9" cy="11" r="0.7" fill={color}/>
        <path d="M14 9c1 1 1 5 0 6M17 10c1 1 1 3 0 4"/>
      </>
    ),
    goat: (
      <>
        <path d="M7 10c0-3 2-5 5-5s5 2 5 5v6c0 2-2 4-5 4s-5-2-5-4z"/>
        <path d="M7 8 5 4M17 8l2-4M9 20l-1 2M15 20l1 2"/>
        <circle cx="10" cy="11" r="0.7" fill={color}/>
        <circle cx="14" cy="11" r="0.7" fill={color}/>
        <path d="M10 15h4M11 17h2"/>
      </>
    ),
    sheep: (
      <>
        <circle cx="12" cy="13" r="6"/>
        <circle cx="6" cy="11" r="2"/>
        <circle cx="18" cy="11" r="2"/>
        <circle cx="8" cy="16" r="2"/>
        <circle cx="16" cy="16" r="2"/>
        <ellipse cx="12" cy="11" rx="2.5" ry="2"/>
        <circle cx="11" cy="11" r="0.5" fill={color}/>
        <circle cx="13" cy="11" r="0.5" fill={color}/>
      </>
    ),
    rabbit: (
      <>
        <path d="M9 4c0 4 1 6 1 8M15 4c0 4-1 6-1 8"/>
        <ellipse cx="12" cy="15" rx="5" ry="5"/>
        <circle cx="10" cy="14" r="0.7" fill={color}/>
        <circle cx="14" cy="14" r="0.7" fill={color}/>
        <path d="M11 17h2M12 18v1"/>
      </>
    ),
    duck: (
      <>
        <path d="M5 18c0-4 3-7 7-7 3 0 5 1 6 3"/>
        <circle cx="16" cy="9" r="3"/>
        <path d="M19 9l2-1-2-1"/>
        <circle cx="16" cy="9" r="0.7" fill={color}/>
        <path d="M5 18h12"/>
      </>
    ),
    turkey: (
      <>
        <ellipse cx="12" cy="15" rx="5" ry="5"/>
        <path d="M12 10c0-3-2-5-2-7M12 10c2-3 4-4 4-6M12 10c-3-1-5-3-5-5M12 10c3-1 5-3 5-5"/>
        <circle cx="12" cy="11" r="1.5"/>
        <path d="M12 13v2"/>
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round">
      {glyphs[kind] || null}
    </svg>
  );
};

// ─── Brand mark — vrai logo FarmOS ────────────────────────────────────────
// `farmos-logo.png` = le VRAI logo (tête de vache réaliste + épis + herbe dans
// un cercle), extrait de la planche officielle farmos-brand-concept.png.
// (Le farmos-icon.svg et l'ancien tracé SVG étaient des versions ratées.)
// Le logo a un trait vert foncé sur fond transparent → `onDark` ajoute une
// pastille claire pour rester lisible sur les fonds foncés (sidebar).
const Brand = ({ size = 28, onDark = false }) => {
  const pad = onDark ? Math.round(size * 0.1) : 0;
  return (
    <span
      role="img"
      aria-label="FarmOS"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, flexShrink: 0, boxSizing: "border-box", padding: pad,
        background: onDark ? "var(--parchment-50, #FBF8F2)" : "transparent",
        borderRadius: onDark ? Math.round(size * 0.24) : 0,
      }}
    >
      <img
        src="/farmos/farmos-logo.png"
        alt="FarmOS"
        style={{ width: size - pad * 2, height: size - pad * 2, objectFit: "contain", display: "block" }}
      />
    </span>
  );
};

export { Icon, AnimalGlyph, Brand };
