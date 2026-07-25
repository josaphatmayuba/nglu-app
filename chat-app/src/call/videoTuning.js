// Reglage video pour les reseaux tres faibles (2G / EDGE / 3G saturee).
//
// Miroir de opusTuning.js : la video s'ajoute au budget deja serre de l'audio
// Opus (8-20 kbps), donc les paliers ci-dessous sont volontairement bas
// compares aux standards WebRTC habituels.

/** Profils de qualite video, du plus econome au plus confortable. */
export const VIDEO_PROFILES = {
  // Camera coupee (manuel ou repli reseau).
  off: {
    label: "off",
    width: 0,
    height: 0,
    fps: 0,
    maxBitrate: 0,
  },
  // 2G/EDGE tres degrade : dernier palier avant coupure.
  minimal: {
    label: "minimal",
    width: 160,
    height: 120,
    fps: 5,
    maxBitrate: 40000, // ~40 kbps
  },
  // 3G instable.
  low: {
    label: "low",
    width: 320,
    height: 240,
    fps: 10,
    maxBitrate: 100000, // ~100 kbps
  },
  // 3G correcte.
  standard: {
    label: "standard",
    width: 480,
    height: 360,
    fps: 15,
    maxBitrate: 250000, // ~250 kbps
  },
  // 4G/WiFi bon.
  high: {
    label: "high",
    width: 640,
    height: 480,
    fps: 20,
    maxBitrate: 500000, // ~500 kbps
  },
};

/**
 * Reecrit le SDP de la section video pour imposer :
 *  - la direction (sendrecv / recvonly / inactive) sur la m=video,
 *  - un plafond de bande passante (b=AS / b=TIAS) selon le palier.
 *
 * Contrairement a Opus, on ne force PAS la resolution/fps en SDP (non expose
 * par les navigateurs pour la video) : ce levier passe par applyConstraints()
 * cote capture et setParameters() cote encodeur (cf useCall.applyVideoConstraints).
 * Le SDP ne sert donc ici qu'au plafond global (b=AS) et a la direction.
 *
 * Codec : on privilegie VP8 (large support). Si VP8 est absent du SDP (rare),
 * on ne munge pas le codec — fallback silencieux au codec par defaut du
 * navigateur ; on applique quand meme b=* et la direction sur la m=video.
 */
export function applyVideoProfile(sdp, profileName, direction) {
  if (!sdp) return sdp;
  const p = VIDEO_PROFILES[profileName] ?? VIDEO_PROFILES.low;

  const lines = sdp.split(/\r\n|\n/);
  // Localise la section m=video : de sa ligne m= jusqu'a la prochaine m= (ou fin).
  const startIdx = lines.findIndex((l) => l.startsWith("m=video"));
  if (startIdx === -1) return sdp; // pas de m=video (ne devrait pas arriver, transceiver pose)

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("m=")) { endIdx = i; break; }
  }

  // Detection VP8 dans la section video (informative : on ne re-munge pas le
  // fmtp VP8, mais on verifie sa presence pour rester coherent avec le plan).
  // La detection sert surtout de garde-fou : si aucun VP8, on ne touche pas au
  // codec, seulement aux b=* et a la direction.
  // (Volontairement pas d'usage plus loin : VP8 est deja le defaut negocie.)

  // Retire les anciennes lignes b=AS/b=TIAS ET les directions existantes de la
  // section video. On memorise la direction retiree pour la cas ou l'appelant
  // ne force PAS de direction (on la remet alors a l'identique, a sa place).
  const removedDir = lines.slice(startIdx, endIdx)
    .filter((l) => /^a=(sendrecv|recvonly|sendonly|inactive)\s*$/.test(l));
  const section = lines.slice(startIdx, endIdx)
    .filter((l) => !/^b=(AS|TIAS):/.test(l)
      && !/^a=(sendrecv|recvonly|sendonly|inactive)\s*$/.test(l));

  // Point d'insertion : l'ordre SDP d'une section media est
  //   m= / i= / c= / b= / a=direction / a=rtpmap / a=fmtp / a=ssrc / ...
  // On insere donc juste APRES les lignes c=/b= (que l'on vient d'ajouter), et
  // AVANT la premiere ligne d'attribut media (a=rtpmap / a=fmtp / a=rtcp-fb /
  // a=ssrc / a=mid / a=extmap ...). C'est la seule position valide pour la
  // direction : la mettre en fin de tableau la ferait atterrir apres la ligne
  // vide terminale du SDP quand m=video est la derniere section => SDP invalide,
  // ce qui bloquait TOUS les appels (regression). On calcule l'index sur la
  // section deja nettoyee, puis on injecte b=* et direction dans le bon ordre.
  let insertAt = 1; // juste apres m=video par defaut
  for (let i = 1; i < section.length; i += 1) {
    // On s'arrete a la premiere ligne d'attribut media : tout ce qui precede
    // (i=, c=, et lignes b= residuelles improbables) reste avant la direction.
    if (section[i].startsWith("a=")) { insertAt = i; break; }
    // Sans aucune ligne a= (SDP degenere) : tout le reste vient avant.
    if (i === section.length - 1) insertAt = section.length;
  }

  const bLines = [];
  const asKbps = Math.ceil((p.maxBitrate / 1000) * 1.15) || 1; // marge en-tetes RTP
  if (p.maxBitrate > 0) {
    bLines.push(`b=AS:${asKbps}`);
    bLines.push(`b=TIAS:${p.maxBitrate}`);
  }

  // direction === null/undefined => on NE force PAS la direction (utile cote
  // appele : la direction de la reponse est deja correctement derivee de l'offre
  // par le navigateur, la reecrire casserait la reception). Dans ce cas on
  // remet la direction retiree a l'identique, a la meme place valide.
  const forceDir = ["sendrecv", "recvonly", "sendonly", "inactive"].includes(direction);
  const dirLines = forceDir ? [`a=${direction}`] : removedDir;

  const rebuilt = [
    ...section.slice(0, insertAt),
    ...bLines,
    ...dirLines,
    ...section.slice(insertAt),
  ];

  const merged = [
    ...lines.slice(0, startIdx),
    ...rebuilt,
    ...lines.slice(endIdx),
  ];

  // Preserve le style de fin de ligne d'origine (CRLF si le SDP en avait).
  const eol = sdp.includes("\r\n") ? "\r\n" : "\n";
  let out = merged.join(eol);
  if (sdp.endsWith("\r\n") || sdp.endsWith("\n")) out += eol;
  return out;
}

/**
 * Choisit le palier video de depart selon l'info reseau du navigateur.
 * Toujours prudent : ne demarre jamais directement au palier "high", meme
 * sur 4G annoncee (miroir de detectInitialProfile, mais plafonne a "low").
 */
export function detectInitialVideoProfile() {
  const conn = typeof navigator !== "undefined"
    ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
    : null;
  if (!conn) return "low";

  const type = String(conn.effectiveType || "").toLowerCase();
  if (type === "slow-2g" || type === "2g") return "minimal";
  if (conn.saveData) return "minimal"; // l'utilisateur a demande l'economie de donnees
  // 3g et 4g demarrent tous les deux a "low" : la video ne monte jamais
  // directement haut, quitte a remonter ensuite si le reseau le confirme.
  return "low";
}

/** Libelles de consommation : cout approximatif Mo/h par palier video. */
export const VIDEO_PROFILE_LABELS = {
  off: "Camera coupee",
  minimal: "Éco vidéo — ~20 Mo/h",
  low: "Normal vidéo — ~45 Mo/h",
  standard: "Qualité vidéo — ~110 Mo/h",
  high: "HD vidéo — ~220 Mo/h",
};
