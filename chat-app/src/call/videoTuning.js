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

// NOTE ARCHITECTURE (abandon du SDP munging video) :
// La fonction applyVideoProfile() qui reecrivait la section m=video (b=AS/b=TIAS
// + ligne de direction) a ete SUPPRIMEE. Elle cassait les appels de facon
// repetee sur mobile. La qualite video (bitrate/framerate/resolution) est
// desormais pilotee EXCLUSIVEMENT par l'API native RTCRtpSender.setParameters()
// et MediaStreamTrack.applyConstraints() (cf useCall.applyVideoConstraints).
// Les profils ci-dessous (VIDEO_PROFILES) alimentent ces deux leviers natifs ;
// le SDP video n'est JAMAIS reecrit a la main. Ne pas reintroduire de munging
// video ici.

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
