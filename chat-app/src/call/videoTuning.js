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

  // Ordre SDP d'une section media (RFC 4566) :
  //   m= / i= / c= / b= / a=... (dont a=rtpmap, a=fmtp, a=direction, a=mid...)
  // Positions d'insertion voulues :
  //  - les b=AS/b=TIAS juste APRES la ligne c= (place canonique du champ b=),
  //  - la direction (a=sendrecv/...) juste AVANT la premiere ligne a=rtpmap.
  // Un SDP Chrome reel commence sa liste d'attributs par a=rtcp/a=ice-ufrag/
  // a=fingerprint/a=setup/a=mid AVANT a=rtpmap : inserer avant le 1er a=
  // quelconque ferait atterrir direction/b= au milieu des lignes DTLS/ICE/mid
  // (tolere mais fragile). On vise donc a=rtpmap, plus stable.
  // Fallback degenere (aucune a=rtpmap) : on insere en fin de section, ce qui
  // reste valide (jamais apres la ligne vide terminale : voir merge plus bas).

  // b= : juste apres la derniere ligne c= (0 ou 1 en pratique). A defaut de c=,
  // juste apres m= (index 0).
  let bInsertAt = 1;
  for (let i = 1; i < section.length; i += 1) {
    if (section[i].startsWith("c=")) { bInsertAt = i + 1; break; }
    if (section[i].startsWith("a=")) break; // les c= precedent tous les a=
  }

  // direction : juste avant la 1re a=rtpmap. Fallback : fin de section.
  let dirInsertAt = section.length;
  for (let i = 1; i < section.length; i += 1) {
    if (section[i].startsWith("a=rtpmap")) { dirInsertAt = i; break; }
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

  // On construit la section en injectant b= puis direction sans invalider les
  // index : on part de la section nettoyee et on applique les deux insertions du
  // plus grand index vers le plus petit.
  const rebuilt = section.slice();
  if (dirInsertAt >= bInsertAt) {
    rebuilt.splice(dirInsertAt, 0, ...dirLines);
    rebuilt.splice(bInsertAt, 0, ...bLines);
  } else {
    rebuilt.splice(bInsertAt, 0, ...bLines);
    rebuilt.splice(dirInsertAt, 0, ...dirLines);
  }

  const merged = [
    ...lines.slice(0, startIdx),
    ...rebuilt,
    ...lines.slice(endIdx),
  ];

  // Preserve le style de fin de ligne d'origine (CRLF si le SDP en avait).
  const eol = sdp.includes("\r\n") ? "\r\n" : "\n";
  let out = merged.join(eol);
  // Le SDP source finit toujours par un eol, donc split() a produit un dernier
  // element "" : merged.join() reproduit DEJA la newline finale. Rajouter un eol
  // (ancien code) donnait "...\r\n\r\n" => ligne vide terminale malformee, que
  // Safari/anciens Chromium mobiles rejettent dans set{Local,Remote}Description
  // (throw) et qui bloquait TOUS les appels. On normalise donc a EXACTEMENT une
  // newline terminale si le SDP source en avait une, zero sinon.
  if (sdp.endsWith("\r\n") || sdp.endsWith("\n")) {
    out = out.replace(/(\r\n|\n)+$/, "") + eol;
  } else {
    out = out.replace(/(\r\n|\n)+$/, "");
  }
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
