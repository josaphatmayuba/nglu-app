// Reglage du codec audio pour les reseaux tres faibles (2G / EDGE / 3G saturee).
//
// Contexte : en GPRS, le debit utile descend sous 40 kbps et la latence depasse
// 300 ms. Les valeurs par defaut de WebRTC (Opus ~32 kbps, ptime 20 ms) ne
// tiennent pas : l'overhead des en-tetes IP/UDP/RTP devient dominant et la
// connexion decroche. Les reglages ci-dessous privilegient la robustesse a la
// qualite : voix intelligible plutot que haute fidelite.

/** Profils de qualite, du plus econome au plus confortable. */
export const AUDIO_PROFILES = {
  // GPRS / reseau sature : intelligibilite avant tout.
  minimal: {
    label: "minimal",
    maxAverageBitrate: 8000, // 8 kbps : plancher utilisable d'Opus en voix
    maxPlaybackRate: 8000, // bande etroite facon telephone
    ptime: 60, // 60 ms/paquet : 3x moins d'en-tetes qu'a 20 ms
    useDtx: true,
    useInbandFec: true,
  },
  // EDGE / 3G instable : compromis par defaut.
  low: {
    label: "low",
    maxAverageBitrate: 12000,
    maxPlaybackRate: 12000,
    ptime: 40,
    useDtx: true,
    useInbandFec: true,
  },
  // 3G correcte et au-dela.
  standard: {
    label: "standard",
    maxAverageBitrate: 20000,
    maxPlaybackRate: 16000,
    ptime: 20,
    useDtx: true,
    useInbandFec: true,
  },
};

/**
 * Reecrit le SDP pour imposer le profil Opus choisi.
 *
 * Le munging SDP est la seule facon fiable de contraindre le bitrate a la
 * negociation : setParameters() sur le sender n'est pas supporte partout et
 * arrive trop tard pour influencer l'etablissement de la connexion.
 */
export function applyOpusProfile(sdp, profile) {
  const p = AUDIO_PROFILES[profile] ?? AUDIO_PROFILES.low;

  // Identifie le payload type d'Opus (variable selon les navigateurs).
  const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i);
  if (!opusMatch) return sdp;
  const pt = opusMatch[1];

  const params = [
    "minptime=10",
    `maxaveragebitrate=${p.maxAverageBitrate}`,
    `maxplaybackrate=${p.maxPlaybackRate}`,
    `sprop-maxcapturerate=${p.maxPlaybackRate}`,
    p.useInbandFec ? "useinbandfec=1" : "useinbandfec=0",
    p.useDtx ? "usedtx=1" : "usedtx=0",
    "stereo=0",
    "sprop-stereo=0",
    "cbr=0", // debit variable : profite des silences
  ].join(";");

  let out = sdp;

  // Remplace (ou insere) la ligne fmtp d'Opus.
  const fmtpRe = new RegExp(`a=fmtp:${pt} .*`, "i");
  if (fmtpRe.test(out)) {
    out = out.replace(fmtpRe, `a=fmtp:${pt} ${params}`);
  } else {
    out = out.replace(
      new RegExp(`(a=rtpmap:${pt} opus/48000/2\r?\n)`, "i"),
      `$1a=fmtp:${pt} ${params}\r\n`,
    );
  }

  // ptime : duree de paquetisation. Plus elle est longue, moins il y a de
  // paquets — donc moins d'overhead reseau, au prix d'un peu de latence.
  out = out.replace(/a=ptime:\d+/g, `a=ptime:${p.ptime}`);
  if (!/a=ptime:/.test(out)) {
    out = out.replace(
      new RegExp(`(a=fmtp:${pt} [^\r\n]*\r?\n)`, "i"),
      `$1a=ptime:${p.ptime}\r\na=maxptime:120\r\n`,
    );
  }

  // Plafond de bande passante au niveau de la session (b=AS, en kbps).
  // Double garde-fou si le fmtp est ignore par une implementation.
  const asKbps = Math.ceil((p.maxAverageBitrate / 1000) * 1.4); // marge en-tetes
  out = out.replace(/^m=audio .*$/m, (line) => `${line}\r\nb=AS:${asKbps}\r\nb=TIAS:${p.maxAverageBitrate}`);
  // Evite les doublons si le SDP contenait deja un b=AS.
  out = out.replace(/(b=AS:\d+\r?\n)(?:b=AS:\d+\r?\n)+/g, "$1");

  return out;
}

/**
 * Retrouve le profil correspondant au debit annonce dans un SDP recu.
 * Permet a l'appele de s'aligner sur le profil choisi par l'appelant, au lieu
 * de repondre avec le sien et de negocier deux debits contradictoires.
 */
export function readOpusProfileFromSdp(sdp) {
  const match = String(sdp || "").match(/maxaveragebitrate=(\d+)/i);
  if (!match) return null;
  const bitrate = Number(match[1]);

  let best = null;
  let bestDelta = Infinity;
  for (const [name, p] of Object.entries(AUDIO_PROFILES)) {
    const delta = Math.abs(p.maxAverageBitrate - bitrate);
    if (delta < bestDelta) { bestDelta = delta; best = name; }
  }
  return best;
}

/** Contraintes micro : reduisent le debit encode avant meme la compression. */
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true, // moins de bruit = moins de bits, et DTX plus efficace
  autoGainControl: true,
  channelCount: 1, // mono : inutile de transporter 2 canaux pour de la voix
  sampleRate: 16000,
};

/**
 * Choisit le profil de depart selon l'info reseau du navigateur.
 * L'API Network Information n'est pas disponible partout (absente sur iOS) :
 * en cas de doute on part sur "low", plus sur que "standard" dans le contexte
 * africain, quitte a remonter ensuite si les statistiques sont bonnes.
 */
export function detectInitialProfile() {
  const conn = typeof navigator !== "undefined"
    ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
    : null;
  if (!conn) return "low";

  const type = String(conn.effectiveType || "").toLowerCase();
  if (type === "slow-2g" || type === "2g") return "minimal";
  if (type === "3g") return "low";
  if (conn.saveData) return "minimal"; // l'utilisateur a demande l'economie de donnees
  if (type === "4g") return "standard";
  return "low";
}
