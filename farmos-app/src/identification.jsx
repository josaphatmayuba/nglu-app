/* eslint-disable */
import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { speciesById } from "./data";
import { api, adaptAnimal } from "./api";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { loadFaceModel, buildFaceIndex, findBestFace } from "./face-recognition";

// ─── Hardware hooks (camera, zxing, web speech, NFC) ────────────────────
// useCamera — getUserMedia + facing toggle + torch (Android Chrome only).
function useCamera(active, modeUsesCamera) {
  const [stream, setStream] = React.useState(null);
  const [facing, setFacing] = React.useState("environment");
  const [torch, setTorch] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [caps, setCaps] = React.useState({});

  React.useEffect(() => {
    if (!active || !modeUsesCamera) { setStream(null); return; }
    let cancelled = false;
    let s = null;
    setError(null);
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        const tr = s.getVideoTracks()[0];
        if (tr && tr.getCapabilities) setCaps(tr.getCapabilities());
      } catch (e) { setError(e?.name || e?.message || String(e)); }
    })();
    return () => { cancelled = true; if (s) s.getTracks().forEach((t) => t.stop()); };
  }, [active, modeUsesCamera, facing]);

  React.useEffect(() => {
    if (!stream || !caps?.torch) return;
    const tr = stream.getVideoTracks()[0];
    tr.applyConstraints({ advanced: [{ torch }] }).catch(() => {});
  }, [stream, torch, caps]);

  return {
    stream, error, facing, torch,
    canTorch: !!caps?.torch,
    flipCamera: () => setFacing((f) => (f === "environment" ? "user" : "environment")),
    toggleTorch: () => setTorch((t) => !t),
  };
}

// useZxingScanner — decode QR / barcode on a video element. onResult(code).
function useZxingScanner(videoRef, stream, enabled, onResult) {
  React.useEffect(() => {
    if (!enabled || !videoRef.current || !stream) return;
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    let controls = null;
    reader.decodeFromStream(stream, videoRef.current, (result, _err, ctrl) => {
      if (!controls) controls = ctrl;
      if (stopped) { ctrl.stop(); return; }
      if (result) onResult(result.getText());
    }).catch(() => {});
    return () => { stopped = true; if (controls) controls.stop(); };
  }, [enabled, stream, onResult, videoRef]);
}

// useNfcReader — Web NFC (Android Chrome only). onTag(serial).
function useNfcReader(enabled, onTag, onError) {
  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      onError && onError("not-supported");
      return;
    }
    let cancelled = false;
    const reader = new window.NDEFReader();
    reader.scan().catch((e) => { if (!cancelled) onError && onError(e?.message || String(e)); });
    const h = (ev) => { if (!cancelled && ev.serialNumber) onTag(ev.serialNumber); };
    reader.addEventListener("reading", h);
    return () => { cancelled = true; reader.removeEventListener && reader.removeEventListener("reading", h); };
  }, [enabled, onTag, onError]);
}

// dictateOnce — Web Speech API single-shot recognition. Returns cancel fn.
function dictateOnce(lang, onResult, onError) {
  const SR = (typeof window !== "undefined") && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) { onError && onError("not-supported"); return null; }
  const r = new SR();
  r.lang = lang === "fr" ? "fr-FR" : "en-US";
  r.continuous = false;
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => onResult(e.results[0][0].transcript);
  r.onerror = (e) => onError && onError(e.error || "error");
  try { r.start(); } catch (e) { onError && onError(e?.message || String(e)); }
  return () => { try { r.stop(); } catch {} };
}

// Identification screen — mobile-first field tool.
// Modes: Scanner (barcode/QR) · RFID/NFC · Photo · Reconnaissance faciale · Saisie manuelle
// After identification → result card with quick actions.
// All animal data is live (api.listAnimals); the camera/RFID hardware paths
// are still simulated (no device API wired) but draw from real DB records.

const RECENT_LS_KEY = "farmos.identification.recent";
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_LS_KEY) || "[]"); } catch { return []; }
}
function saveRecent(list) {
  try { localStorage.setItem(RECENT_LS_KEY, JSON.stringify(list.slice(0, 8))); } catch {}
}
function timeAgo(iso, lang) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return lang === "fr" ? "À l'instant" : "Just now";
  if (m < 60) return lang === "fr" ? `Il y a ${m} min` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "fr" ? `Il y a ${h} h` : `${h} h ago`;
  const d = Math.floor(h / 24);
  return lang === "fr" ? `Il y a ${d} j` : `${d} d ago`;
}

const Identification = ({ lang, speciesFilter, onNav }) => {
  const [mode, setMode] = React.useState("scanner");
  const [scanning, setScanning] = React.useState(false);
  const [found, setFound] = React.useState(null);
  const [photo, setPhoto] = React.useState(null);
  const [flash, setFlash] = React.useState(false);
  const [animals, setAnimals] = React.useState([]);
  const [recent, setRecent] = React.useState([]);
  const videoRef = React.useRef(null);
  // Reco faciale (lazy)
  const [face, setFace] = React.useState({ state: "idle", index: null, progress: null, lastScore: null, error: null });
  const faceModelRef = React.useRef(null);

  const cameraModes = ["scanner", "qr", "face", "photo"];
  const modeUsesCamera = cameraModes.includes(mode) && !found;
  const cam = useCamera(true, modeUsesCamera);

  React.useEffect(() => {
    if (videoRef.current && cam.stream) {
      videoRef.current.srcObject = cam.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [cam.stream]);

  // Fetch live animals + rehydrate recent identifications from localStorage.
  React.useEffect(() => {
    let cancel = false;
    api.listAnimals().then((rows) => {
      if (cancel || !Array.isArray(rows)) return;
      const adapted = rows.map(adaptAnimal);
      setAnimals(adapted);
      const stored = loadRecent();
      // Re-link stored ids back to current animal objects (may have been deleted).
      const hydrated = stored
        .map((r) => ({ ...r, animal: adapted.find((a) => a._pk === r.animalPk) }))
        .filter((r) => r.animal);
      setRecent(hydrated);
    }).catch(() => {});
    return () => { cancel = true; };
  }, []);

  const modes = [
    { id: "scanner", icon: "scanLine", fr: "Code-barre", en: "Barcode" },
    { id: "qr",      icon: "qr",       fr: "QR code",    en: "QR code" },
    { id: "rfid",    icon: "rfid",     fr: "RFID / NFC", en: "RFID / NFC" },
    { id: "face",    icon: "user",     fr: "Reco faciale", en: "Face recog." },
    { id: "photo",   icon: "camera",   fr: "Photo",      en: "Photo" },
    { id: "manual",  icon: "edit",     fr: "Manuel",     en: "Manual" },
  ];

  // Manual / résultat direct : un animal a été choisi explicitement.
  // Plus de "pick aléatoire" — si rien n'est scanné, on n'affiche rien.
  const acceptResult = (specific) => {
    if (!specific) return;
    setFound(specific);
    setScanning(false);
    const newRec = { animalPk: specific._pk, externalId: specific.id, method: mode, at: new Date().toISOString() };
    setRecent((r) => {
      const next = [{ ...newRec, animal: specific }, ...r.filter((x) => x.animalPk !== specific._pk)].slice(0, 8);
      saveRecent(next.map(({ animal, ...rest }) => rest));
      return next;
    });
  };

  // Bouton "scan" central : selon le mode, déclenche l'action réelle.
  // Pour QR/scanner/rfid on n'invente pas de résultat — on rappelle juste
  // qu'il faut que le code soit dans le champ de la caméra / du lecteur.
  const onScanButton = () => {
    if (mode === "photo") return handlePhoto();
    if (mode === "qr" || mode === "scanner") {
      if (!cam.stream) {
        window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
          severity: "info",
          message: lang === "fr" ? "Caméra non disponible — autorise l'accès puis pointe vers le code." : "Camera unavailable — grant access then aim at the code.",
        } }));
      } else {
        window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
          severity: "info",
          message: lang === "fr" ? "En attente du scan… maintiens le code dans le cadre." : "Waiting for scan… keep the code in the frame.",
        } }));
      }
      return;
    }
    if (mode === "rfid") {
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "info",
        message: lang === "fr"
          ? (typeof window !== "undefined" && "NDEFReader" in window ? "Approche le lecteur NFC de la boucle." : "NFC non supporté sur ce navigateur.")
          : (typeof window !== "undefined" && "NDEFReader" in window ? "Bring the NFC reader close to the tag." : "NFC not supported on this browser."),
      } }));
      return;
    }
    if (mode === "face") {
      return runFaceScan();
    }
  };

  // Charge MobileNet + construit l'index d'embeddings (1 fois par session).
  const ensureFaceIndex = React.useCallback(async () => {
    if (face.state === "loading" || face.state === "indexing" || face.state === "ready") return;
    setFace((f) => ({ ...f, state: "loading", error: null }));
    try {
      const bundle = await loadFaceModel();
      faceModelRef.current = bundle;
      setFace((f) => ({ ...f, state: "indexing", progress: { done: 0, total: 0 } }));
      const rows = await api.listAnimalsWithPhotos(3);
      const safeRows = Array.isArray(rows) ? rows : [];
      if (safeRows.length === 0) {
        setFace({ state: "empty", index: null, progress: null, lastScore: null, error: null });
        window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
          severity: "info",
          message: lang === "fr"
            ? "Aucune photo d'animal en base — uploade des photos depuis la fiche pour entraîner la reco."
            : "No animal photos on file — upload photos from the animal page to enroll faces.",
        } }));
        return;
      }
      const idx = await buildFaceIndex(bundle, safeRows, (p) => setFace((f) => ({ ...f, progress: p })));
      setFace({ state: "ready", index: idx, progress: null, lastScore: null, error: null });
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "success",
        message: lang === "fr"
          ? `Reco faciale prête — ${idx.animals.length} animaux indexés.`
          : `Face recog ready — ${idx.animals.length} animals indexed.`,
      } }));
    } catch (err) {
      setFace({ state: "error", index: null, progress: null, lastScore: null, error: err.message || String(err) });
    }
  }, [face.state, lang]);

  // Quand l'utilisateur ouvre l'onglet "face", on déclenche le chargement
  // (modèle + index) sans attendre qu'il appuie sur "scan".
  React.useEffect(() => {
    if (mode === "face") ensureFaceIndex();
  }, [mode, ensureFaceIndex]);

  const runFaceScan = async () => {
    if (face.state !== "ready") {
      // Si pas prêt, on (re)lance le chargement et on prévient.
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "info",
        message: face.state === "indexing"
          ? (lang === "fr" ? "Indexation en cours…" : "Indexing…")
          : (lang === "fr" ? "Modèle en chargement…" : "Loading model…"),
      } }));
      ensureFaceIndex();
      return;
    }
    if (!videoRef.current || !cam.stream) {
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "error",
        message: lang === "fr" ? "Caméra non disponible." : "Camera unavailable.",
      } }));
      return;
    }
    try {
      setScanning(true);
      const v = videoRef.current;
      const c = document.createElement("canvas");
      c.width = v.videoWidth || 640;
      c.height = v.videoHeight || 480;
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      const res = await findBestFace(faceModelRef.current, c, face.index, 0.78);
      setFace((f) => ({ ...f, lastScore: res.score }));
      if (res.match) {
        // Le match renvoyé est au format backend (externalId, name…). On le
        // ré-aligne sur la forme front (id, _pk) via la liste live.
        const live = animals.find((a) => a._pk === res.match.id) || {
          ...res.match, _pk: res.match.id, id: res.match.externalId || `farmos-${res.match.id}`,
        };
        acceptResult(live);
        window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
          severity: "success",
          message: (lang === "fr" ? "Reconnu : " : "Recognized: ") + (live.name || live.id) + ` (${Math.round(res.score * 100)}%)`,
        } }));
      } else {
        window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
          severity: "info",
          message: lang === "fr"
            ? `Animal non reconnu (meilleur score ${Math.round(res.score * 100)}%, seuil 78%).`
            : `Not recognized (best score ${Math.round(res.score * 100)}%, threshold 78%).`,
        } }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "error",
        message: (lang === "fr" ? "Erreur reco : " : "Recog error: ") + (err.message || String(err)),
      } }));
    } finally {
      setScanning(false);
    }
  };

  const handlePhoto = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    // Snapshot the current frame so we can show it on the result card / upload.
    if (videoRef.current && cam.stream) {
      try {
        const v = videoRef.current;
        const c = document.createElement("canvas");
        c.width = v.videoWidth || 1280;
        c.height = v.videoHeight || 720;
        const ctx = c.getContext("2d");
        ctx.drawImage(v, 0, 0, c.width, c.height);
        setPhoto(c.toDataURL("image/jpeg", 0.85));
      } catch {}
    }
    // Photo prise — pas d'identification automatique. L'utilisateur peut
    // saisir l'animal en mode "manuel" si besoin.
  };

  // Find an animal by code read from QR/barcode/NFC. Matches against
  // external_id (case-insensitive). If found, treat as identification.
  const onCodeRead = React.useCallback((code) => {
    if (!code || found || scanning) return;
    const norm = String(code).trim().toLowerCase();
    const match = animals.find((a) => (a.id || "").toLowerCase() === norm)
               || animals.find((a) => (a.id || "").toLowerCase().includes(norm));
    if (match) {
      const newRec = { animalPk: match._pk, externalId: match.id, method: mode, at: new Date().toISOString() };
      setRecent((r) => {
        const next = [{ ...newRec, animal: match }, ...r.filter((x) => x.animalPk !== match._pk)].slice(0, 8);
        saveRecent(next.map(({ animal, ...rest }) => rest));
        return next;
      });
      setFound(match);
    } else {
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "info",
        message: lang === "fr" ? `Code « ${code} » : aucun animal correspondant.` : `Code "${code}": no matching animal.`,
      } }));
    }
  }, [animals, found, scanning, mode, lang]);

  useZxingScanner(videoRef, cam.stream, modeUsesCamera && (mode === "qr" || mode === "scanner"), onCodeRead);

  React.useEffect(() => {
    const h = (ev) => onCodeRead(ev.detail);
    window.addEventListener("farmos:scan-code", h);
    return () => window.removeEventListener("farmos:scan-code", h);
  }, [onCodeRead]);
  useNfcReader(
    mode === "rfid" && !found,
    onCodeRead,
    (err) => {
      if (err === "not-supported") return; // silent (we already show UI hint)
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "error",
        message: (lang === "fr" ? "NFC : " : "NFC: ") + err,
      } }));
    },
  );

  const reset = () => { setFound(null); setPhoto(null); };

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 14, overflow: "auto", height: "100%" }}>
      {/* Header */}
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>
          {lang === "fr" ? "Sur le terrain · Field" : "Field · Sur le terrain"}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.03em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Identification, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>scanner instantané</span></> : <>Identification, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>instant scanner</span></>}
        </h1>
      </div>

      {/* Mode tabs (scrollable) */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, flexShrink: 0, scrollbarWidth: "none" }}>
        {modes.map((m) => {
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => { setMode(m.id); reset(); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 14px", height: 38,
                border: `1px solid ${active ? "var(--clay-700)" : "var(--border-2)"}`,
                background: active ? "var(--clay-700)" : "var(--paper)",
                color: active ? "var(--bone-50)" : "var(--ink-800)",
                borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
                boxShadow: active ? "0 4px 12px -4px rgba(168,90,42,0.4)" : "none",
                transition: "all 120ms",
              }}>
              <Icon name={m.icon} size={14} color="currentColor"/>
              {lang === "fr" ? m.fr : m.en}
            </button>
          );
        })}
      </div>

      {/* Viewport + result */}
      {!found && mode !== "manual" && (
        <>
          {mode === "face" && <FaceStatusBar lang={lang} face={face} onRetry={ensureFaceIndex}/>}
          <CameraViewport
            mode={mode} scanning={scanning} flash={flash}
            onScan={onScanButton}
            lang={lang}
            videoRef={videoRef}
            camStream={cam.stream}
            camError={cam.error}
            canTorch={cam.canTorch}
            torchOn={cam.torch}
            onToggleTorch={cam.toggleTorch}
            onFlipCamera={cam.flipCamera}
          />
        </>
      )}

      {!found && mode === "manual" && <ManualEntry lang={lang} animals={animals} onFound={(a) => acceptResult(a)}/>}

      {found && <ResultCard lang={lang} animal={found} method={mode} onClose={reset} onNav={onNav}/>}

      {/* Recent identifications */}
      {!found && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="overline">{lang === "fr" ? `Récents · ${recent.length}` : `Recent · ${recent.length}`}</div>
            {recent.length > 0 && (
              <button className="btn btn-sm btn-ghost"
                onClick={() => { setRecent([]); saveRecent([]); }}
                title={lang === "fr" ? "Effacer l'historique" : "Clear history"}>
                <Icon name="trash" size={12} color="var(--ink-600)"/>
                {lang === "fr" ? "Effacer" : "Clear"}
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", padding: 12, textAlign: "center", background: "var(--bg-sunken)", borderRadius: 8 }}>
              {lang === "fr" ? "Aucune identification récente. Scanne un animal pour commencer." : "No recent identifications. Scan an animal to start."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recent.map((r) => {
                const sp = speciesById(r.animal.species) || { glyph: null, accent: "var(--ink-700)", accentBg: "var(--bg-sunken)" };
                const methodLabels = { qr: "QR", rfid: "RFID", scanner: lang === "fr" ? "Code-barre" : "Barcode", face: lang === "fr" ? "Faciale" : "Face", photo: "Photo", manual: lang === "fr" ? "Manuel" : "Manual" };
                return (
                  <button key={`${r.animalPk}-${r.at}`} onClick={() => setFound(r.animal)}
                    className="card" style={{
                      padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
                      cursor: "pointer", textAlign: "left", border: "1px solid var(--border-1)",
                      background: "var(--paper)",
                    }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <AnimalGlyph kind={sp.glyph} size={22} color="currentColor"/>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-900)", letterSpacing: "-0.01em" }}>{r.animal.name || r.animal.id}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 1 }}>{r.animal.id}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                      <span className="tag" style={{ fontSize: 10, padding: "2px 6px" }}>{methodLabels[r.method]}</span>
                      <span style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 3 }}>{timeAgo(r.at, lang)}</span>
                    </div>
                    <Icon name="chevRight" size={14} color="var(--fg-3)"/>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Camera viewport (real getUserMedia stream + zxing scan overlays) ───
const CameraViewport = ({ mode, scanning, flash, onScan, lang, videoRef, camStream, camError, canTorch, torchOn, onToggleTorch, onFlipCamera }) => {
  const messages = {
    scanner: {
      fr: scanning ? "Lecture du code-barre…" : "Pointez vers le code-barre de la boucle",
      en: scanning ? "Reading barcode…" : "Point at the ear-tag barcode",
    },
    qr: {
      fr: scanning ? "Lecture du QR code…" : "Cadrez le QR code dans la zone",
      en: scanning ? "Reading QR code…" : "Center the QR code in the frame",
    },
    rfid: {
      fr: scanning ? "Détection en cours…" : "Approchez le lecteur RFID de la boucle (5 cm max)",
      en: scanning ? "Detecting…" : "Hold reader near tag (5 cm max)",
    },
    face: {
      fr: scanning ? "Analyse biométrique en cours…" : "Cadrez la tête de l'animal — reconnaissance IA",
      en: scanning ? "Biometric analysis…" : "Frame the animal's head — AI recognition",
    },
    photo: {
      fr: scanning ? "Capture en cours…" : "Centrez l'animal puis touchez le déclencheur",
      en: scanning ? "Capturing…" : "Center the animal and tap the shutter",
    },
  };
  const msg = messages[mode][lang];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        position: "relative", width: "100%", aspectRatio: "3 / 4", maxHeight: 460,
        borderRadius: 18, overflow: "hidden",
        background: "linear-gradient(165deg, #1B2E22 0%, #0E2418 50%, #06140D 100%)",
        boxShadow: "0 8px 20px -6px rgba(14,36,24,0.32), inset 0 0 0 1px rgba(255,255,255,0.05)",
      }}>
        {/* Live camera stream (or fallback gradient + hint when unavailable) */}
        {camStream ? (
          <video ref={videoRef} autoPlay playsInline muted
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}/>
        ) : (
          <>
            <CameraBackground mode={mode}/>
            {camError && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", color: "rgba(236,241,236,0.9)", zIndex: 3 }}>
                <Icon name="alert" size={28} color="#F0D6CB"/>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                  {lang === "fr" ? "Caméra indisponible" : "Camera unavailable"}
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(236,241,236,0.65)", marginTop: 4, maxWidth: 260 }}>
                  {camError === "NotAllowedError"
                    ? (lang === "fr" ? "Autorise l'accès caméra dans le navigateur." : "Allow camera access in the browser.")
                    : camError}
                </div>
              </div>
            )}
          </>
        )}

        {/* Mode-specific overlays */}
        {mode === "scanner" && <BarcodeOverlay scanning={scanning}/>}
        {mode === "qr"      && <QrOverlay scanning={scanning}/>}
        {mode === "rfid"    && <RfidOverlay scanning={scanning}/>}
        {mode === "face"    && <FaceOverlay scanning={scanning}/>}
        {mode === "photo"   && <PhotoOverlay scanning={scanning}/>}

        {/* Top HUD */}
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5 }}>
          <span className="tag" style={{ background: "rgba(14,36,24,0.7)", color: "var(--bone-50)", border: "1px solid rgba(236,241,236,0.2)", backdropFilter: "blur(8px)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: scanning ? "var(--rust-500)" : "var(--sage-500)", animation: scanning ? "farm-pulse 1s infinite" : "none" }}/>
            {scanning ? (lang === "fr" ? "EN COURS" : "SCANNING") : (lang === "fr" ? "PRÊT" : "READY")}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={onToggleTorch}
              disabled={!canTorch}
              title={canTorch ? (lang === "fr" ? "Lampe torche" : "Torch") : (lang === "fr" ? "Torche non supportée" : "Torch unsupported")}
              style={{
                width: 32, height: 32, borderRadius: 999, border: 0,
                background: torchOn ? "rgba(215,170,69,0.8)" : "rgba(14,36,24,0.6)",
                color: "var(--bone-50)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: canTorch ? "pointer" : "not-allowed",
                opacity: canTorch ? 1 : 0.45,
                backdropFilter: "blur(8px)",
              }}>
              <Icon name="flash" size={14} color="currentColor"/>
            </button>
            <button
              onClick={onFlipCamera}
              title={lang === "fr" ? "Changer de caméra" : "Flip camera"}
              style={{ width: 32, height: 32, borderRadius: 999, border: 0, background: "rgba(14,36,24,0.6)", color: "var(--bone-50)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)" }}>
              <Icon name="rotate" size={14} color="currentColor"/>
            </button>
          </div>
        </div>

        {/* Bottom message */}
        <div style={{ position: "absolute", bottom: 16, left: 12, right: 12, zIndex: 5, textAlign: "center" }}>
          <div style={{
            display: "inline-block", padding: "8px 14px", borderRadius: 999,
            background: "rgba(14,36,24,0.75)", color: "var(--bone-50)",
            border: "1px solid rgba(236,241,236,0.16)",
            backdropFilter: "blur(8px)", fontSize: 12, fontWeight: 500, maxWidth: "92%",
          }}>{msg}</div>
        </div>

        {/* Flash overlay */}
        {flash && (
          <div style={{ position: "absolute", inset: 0, background: "#FFFCF6", zIndex: 20, animation: "fade-in 80ms reverse" }}/>
        )}
      </div>

      {/* Capture / scan button */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <MicButton lang={lang} onText={(txt) => window.dispatchEvent(new CustomEvent("farmos:scan-code", { detail: txt }))}/>
        <button onClick={onScan} disabled={scanning} style={{
          flex: 1, height: 56, borderRadius: 999, border: 0, cursor: scanning ? "wait" : "pointer",
          background: scanning ? "var(--forest-700)" : (mode === "photo" ? "var(--bone-50)" : "var(--clay-700)"),
          color: mode === "photo" && !scanning ? "var(--ink-900)" : "var(--bone-50)",
          border: mode === "photo" && !scanning ? "3px solid var(--clay-700)" : "none",
          fontWeight: 700, fontSize: 15, letterSpacing: "-0.005em",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: "0 8px 20px -6px rgba(168,90,42,0.45)",
          transition: "all 120ms",
        }}>
          {mode === "photo" && !scanning ? (
            <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--clay-700)" }}/>
          ) : (
            <>
              <Icon name={mode === "rfid" ? "rfid" : mode === "face" ? "user" : mode === "scanner" ? "scanLine" : mode === "qr" ? "qr" : "camera"} size={18} color="currentColor"/>
              {scanning
                ? (lang === "fr" ? "Analyse…" : "Analyzing…")
                : (lang === "fr"
                    ? (mode === "rfid" ? "Détecter" : mode === "face" ? "Reconnaître" : mode === "photo" ? "Capturer" : "Scanner")
                    : (mode === "rfid" ? "Detect" : mode === "face" ? "Recognize" : mode === "photo" ? "Capture" : "Scan")
                  )}
            </>
          )}
        </button>
        <button className="btn" style={{ flex: 0, width: 44, height: 44, padding: 0, justifyContent: "center", borderRadius: 999 }}>
          <Icon name="gallery" size={18} color="var(--ink-700)"/>
        </button>
      </div>
    </div>
  );
};

// ─── Simulated camera background (barn floor + silhouette) ───────────────
const CameraBackground = ({ mode }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    {/* Vague animal silhouette */}
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.42 }}>
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#3D5847" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#06140D" stopOpacity="0.85"/>
        </radialGradient>
        <linearGradient id="cow-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3D5847"/>
          <stop offset="100%" stopColor="#1B2E22"/>
        </linearGradient>
      </defs>
      {/* Vague animal blob (head + ears + body) */}
      <ellipse cx="150" cy="220" rx="120" ry="80" fill="url(#cow-body)"/>
      <ellipse cx="150" cy="150" rx="55" ry="48" fill="url(#cow-body)"/>
      <ellipse cx="110" cy="115" rx="14" ry="20" fill="url(#cow-body)" transform="rotate(-30 110 115)"/>
      <ellipse cx="190" cy="115" rx="14" ry="20" fill="url(#cow-body)" transform="rotate(30 190 115)"/>
      <ellipse cx="135" cy="148" rx="5" ry="6" fill="#0E2418"/>
      <ellipse cx="165" cy="148" rx="5" ry="6" fill="#0E2418"/>
      <ellipse cx="150" cy="172" rx="14" ry="9" fill="#0E2418" opacity="0.4"/>
      {/* Ear tag rectangle for context */}
      <rect x="78" y="106" width="22" height="14" rx="2" fill="#FAEFD0" opacity="0.95" transform="rotate(-30 89 113)"/>
      <text x="89" y="116" textAnchor="middle" fontSize="6" fontFamily="monospace" fill="#1B2E22" transform="rotate(-30 89 113)">0118</text>
    </svg>
    {/* Vignette */}
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 100% at 50% 50%, transparent 30%, rgba(6,20,13,0.55) 100%)" }}/>
    {/* Subtle noise / grain */}
    <div style={{ position: "absolute", inset: 0, opacity: 0.04, mixBlendMode: "overlay",
      backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
      backgroundSize: "3px 3px",
    }}/>
  </div>
);

// ─── Barcode overlay ─────────────────────────────────────────────────────
const BarcodeOverlay = ({ scanning }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
    <div style={{ position: "relative", width: "76%", height: 130, borderRadius: 8 }}>
      <CornerBrackets color={scanning ? "var(--wheat-400)" : "var(--bone-50)"}/>
      {/* Fake barcode lines */}
      <div style={{ position: "absolute", inset: "16px 18px", display: "flex", gap: 2, alignItems: "stretch", opacity: 0.5 }}>
        {Array.from({length: 28}).map((_, i) => (
          <span key={i} style={{ background: "var(--bone-50)", width: ([1, 4, 2, 3, 1, 2, 5, 1, 3][i % 9] || 2) }}/>
        ))}
      </div>
      {scanning && <ScanLine vertical={false}/>}
    </div>
  </div>
);

// ─── QR overlay ──────────────────────────────────────────────────────────
const QrOverlay = ({ scanning }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
    <div style={{ position: "relative", width: 200, height: 200, borderRadius: 12 }}>
      <CornerBrackets color={scanning ? "var(--wheat-400)" : "var(--bone-50)"} thicker/>
      {scanning && <ScanLine vertical={false}/>}
    </div>
  </div>
);

// ─── RFID overlay — concentric pulse waves ───────────────────────────────
const RfidOverlay = ({ scanning }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
    <div style={{ position: "relative", width: 220, height: 220 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          position: "absolute", inset: 0, borderRadius: 999,
          border: "2px solid rgba(215,170,69,0.7)",
          animation: scanning ? `rfid-pulse 1.4s ${i * 0.35}s infinite ease-out` : "none",
          opacity: scanning ? 1 : 0.35,
        }}/>
      ))}
      <div style={{
        position: "absolute", inset: "40%", borderRadius: 999, background: "var(--wheat-400)", color: "var(--forest-900)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(215,170,69,0.6)",
      }}>
        <Icon name="rfid" size={26} color="currentColor"/>
      </div>
    </div>
    <style>{`@keyframes rfid-pulse { 0% { transform: scale(0.4); opacity: 0.9; } 100% { transform: scale(1.4); opacity: 0; } }`}</style>
  </div>
);

// ─── Face recognition overlay ────────────────────────────────────────────
const FaceOverlay = ({ scanning }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
    <div style={{ position: "relative", width: "62%", maxWidth: 200, aspectRatio: "1/1", borderRadius: "50%" }}>
      <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ position: "absolute", inset: 0 }}>
        <ellipse cx="100" cy="100" rx="92" ry="92" fill="none" stroke={scanning ? "var(--wheat-400)" : "var(--bone-50)"} strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" style={{ animation: scanning ? "spin 8s linear infinite" : "none", transformOrigin: "100px 100px" }}/>
        {/* feature points */}
        {scanning && (
          <>
            <circle cx="78" cy="85" r="3" fill="var(--wheat-400)"/>
            <circle cx="122" cy="85" r="3" fill="var(--wheat-400)"/>
            <circle cx="100" cy="110" r="3" fill="var(--wheat-400)"/>
            <circle cx="82" cy="125" r="3" fill="var(--wheat-400)"/>
            <circle cx="118" cy="125" r="3" fill="var(--wheat-400)"/>
            <line x1="78" y1="85" x2="122" y2="85" stroke="var(--wheat-400)" strokeWidth="1" opacity="0.5"/>
            <line x1="100" y1="110" x2="82" y2="125" stroke="var(--wheat-400)" strokeWidth="1" opacity="0.5"/>
            <line x1="100" y1="110" x2="118" y2="125" stroke="var(--wheat-400)" strokeWidth="1" opacity="0.5"/>
          </>
        )}
      </svg>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── Photo overlay — rule of thirds grid ─────────────────────────────────
const PhotoOverlay = ({ scanning }) => (
  <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
    <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
      <line x1="33%" y1="0" x2="33%" y2="100%" stroke="rgba(236,241,236,0.18)" strokeWidth="1"/>
      <line x1="66%" y1="0" x2="66%" y2="100%" stroke="rgba(236,241,236,0.18)" strokeWidth="1"/>
      <line x1="0" y1="33%" x2="100%" y2="33%" stroke="rgba(236,241,236,0.18)" strokeWidth="1"/>
      <line x1="0" y1="66%" x2="100%" y2="66%" stroke="rgba(236,241,236,0.18)" strokeWidth="1"/>
    </svg>
    {/* Auto-focus square */}
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 90, height: 90, border: "1.5px solid var(--wheat-400)", borderRadius: 4 }}/>
  </div>
);

// ─── Corner brackets ─────────────────────────────────────────────────────
const CornerBrackets = ({ color = "var(--bone-50)", thicker = false }) => {
  const len = 22, t = thicker ? 3 : 2.5;
  const corner = (style) => ({
    position: "absolute", width: len, height: len, ...style,
  });
  return (
    <>
      <div style={{ ...corner({ top: 0, left: 0, borderTop: `${t}px solid ${color}`, borderLeft: `${t}px solid ${color}`, borderTopLeftRadius: 4 }) }}/>
      <div style={{ ...corner({ top: 0, right: 0, borderTop: `${t}px solid ${color}`, borderRight: `${t}px solid ${color}`, borderTopRightRadius: 4 }) }}/>
      <div style={{ ...corner({ bottom: 0, left: 0, borderBottom: `${t}px solid ${color}`, borderLeft: `${t}px solid ${color}`, borderBottomLeftRadius: 4 }) }}/>
      <div style={{ ...corner({ bottom: 0, right: 0, borderBottom: `${t}px solid ${color}`, borderRight: `${t}px solid ${color}`, borderBottomRightRadius: 4 }) }}/>
    </>
  );
};

// ─── Scan line ───────────────────────────────────────────────────────────
const ScanLine = ({ vertical }) => (
  <>
    <div style={{
      position: "absolute", left: 0, right: 0, top: 0, height: 2,
      background: "linear-gradient(90deg, transparent 0%, var(--wheat-400) 50%, transparent 100%)",
      boxShadow: "0 0 12px var(--wheat-400)",
      animation: "scan-vert 1.6s ease-in-out infinite",
    }}/>
    <style>{`@keyframes scan-vert { 0%,100% { top: 0; opacity: 1; } 50% { top: calc(100% - 2px); opacity: 0.9; } }`}</style>
  </>
);

// MicButton — Web Speech API single-shot dictation.
const MicButton = ({ lang, onText }) => {
  const [listening, setListening] = React.useState(false);
  const cancelRef = React.useRef(null);
  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!supported) return null;
  const start = () => {
    if (listening) { cancelRef.current && cancelRef.current(); setListening(false); return; }
    setListening(true);
    cancelRef.current = dictateOnce(
      lang,
      (txt) => { onText(txt); setListening(false); },
      (err) => {
        setListening(false);
        window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
          severity: "error", message: (lang === "fr" ? "Micro : " : "Mic: ") + err,
        } }));
      },
    );
  };
  return (
    <button onClick={start} title={lang === "fr" ? "Dicter" : "Dictate"}
      style={{
        width: 32, height: 32, borderRadius: 999, border: 0,
        background: listening ? "var(--rust-700)" : "var(--bg-sunken)",
        color: listening ? "var(--bone-50)" : "var(--ink-700)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        animation: listening ? "farm-pulse 1s infinite" : "none",
      }}>
      <Icon name="mic" size={14} color="currentColor"/>
    </button>
  );
};

// ─── Manual entry ────────────────────────────────────────────────────────
const ManualEntry = ({ lang, animals, onFound }) => {
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const matches = (animals || []).filter((a) =>
    ql.length > 0 && (
      (a.id || "").toLowerCase().includes(ql) ||
      (a.name || "").toLowerCase().includes(ql) ||
      (a.race || "").toLowerCase().includes(ql) ||
      (a.lot || "").toLowerCase().includes(ql)
    )
  ).slice(0, 8);

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "Recherche par ID ou nom" : "Search by ID or name"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "0 14px", height: 48 }}>
        <Icon name="search" size={18} color="var(--ink-500)"/>
        <input
          autoFocus
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "fr" ? "BQ-2024-… ou Marguerite" : "BQ-2024-… or Marguerite"}
          style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontSize: 16, color: "var(--ink-900)", fontFamily: "var(--font-mono)" }}
        />
        <MicButton lang={lang} onText={(txt) => setQ(txt)}/>
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {matches.map((a) => {
          const sp = speciesById(a.species) || { glyph: null, accent: "var(--ink-700)", accentBg: "var(--bg-sunken)" };
          return (
            <button key={a._pk || a.id} onClick={() => onFound(a)} className="card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", border: "1px solid var(--border-1)", background: "var(--bg-sunken)" }}>
              <AnimalGlyph kind={sp.glyph} size={18} color={sp.accent}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-900)" }}>{a.name}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{a.id} · {a.race}</div>
              </div>
              <Icon name="chevRight" size={14} color="var(--fg-3)"/>
            </button>
          );
        })}
        {q.length > 0 && matches.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--fg-3)", textAlign: "center", padding: 16 }}>
            {lang === "fr" ? "Aucun animal trouvé. Créer un nouveau ?" : "No animal found. Create a new one?"}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Result card (after identification) ──────────────────────────────────
const ResultCard = ({ lang, animal, method, onClose, onNav }) => {
  const sp = speciesById(animal.species);
  const statusColor = animal.status === "healthy" ? "var(--sage-500)" : animal.status === "treatment" ? "var(--wheat-500)" : "var(--rust-700)";
  const statusLbl = { healthy: lang === "fr" ? "Sain" : "Healthy", treatment: lang === "fr" ? "Sous traitement" : "Under treatment", alert: lang === "fr" ? "Alerte" : "Alert" }[animal.status];

  const actions = [
    { id: "view",      icon: "eye",       fr: "Voir fiche",          en: "View record",        color: "var(--forest-900)" },
    { id: "treatment", icon: "syringe",   fr: "Saisir traitement",   en: "Add treatment",      color: "var(--clay-700)",     event: "health" },
    { id: "milk",      icon: "droplet",   fr: "Production",          en: "Production",         color: "var(--sky-700)",      event: "production" },
    { id: "photo",     icon: "camera",    fr: "Ajouter photo",       en: "Add photo",          color: "var(--forest-700)" },
    { id: "weight",    icon: "weight",    fr: "Pesée",               en: "Weigh",              color: "var(--wheat-700)",    event: "production" },
    { id: "death",     icon: "alert",     fr: "Déclarer mortalité",  en: "Report death",       color: "var(--rust-700)",     event: "death" },
  ];

  // Hidden file input for the "Add photo" action — uploads to backend.
  const fileRef = React.useRef(null);
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!animal?._pk) {
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "error",
        message: lang === "fr" ? "Cet animal n'est pas en BD — impossible de stocker la photo." : "This animal is not in DB — cannot store photo.",
      } }));
      e.target.value = "";
      return;
    }
    try {
      const { fileToDataUrl } = await import("./api");
      const dataUrl = await fileToDataUrl(file);
      const { api } = await import("./api");
      await api.uploadAnimalPhoto(animal._pk, {
        data_url: dataUrl,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      });
      window.dispatchEvent(new CustomEvent("farmos:photo-uploaded", { detail: { animalId: animal._pk } }));
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "success",
        message: lang === "fr" ? `Photo enregistrée (${Math.round(file.size / 1024)} ko)` : `Photo saved (${Math.round(file.size / 1024)} kb)`,
      } }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent("farmos:toast", { detail: {
        severity: "error",
        message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message,
      } }));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Success banner */}
      <div style={{
        background: "linear-gradient(135deg, var(--sage-700) 0%, var(--sage-900) 100%)",
        color: "var(--bone-50)", borderRadius: 14, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 12,
        boxShadow: "0 6px 16px -4px rgba(46,92,66,0.32)",
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={18} color="#FBF8F2"/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
            {lang === "fr" ? `Identifié via ${methodName(method, lang)}` : `Identified via ${methodName(method, lang)}`}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 1 }}>
            {lang === "fr" ? "Animal trouvé · " : "Animal found · "}
            <span className="mono" style={{ fontSize: 14, opacity: 0.85 }}>{animal.id}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 999, border: 0, background: "rgba(255,255,255,0.15)", color: "var(--bone-50)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={14} color="currentColor"/>
        </button>
      </div>

      {/* Animal card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Photo placeholder */}
        <div style={{
          height: 140, position: "relative", overflow: "hidden",
          background: `linear-gradient(135deg, ${sp.accent} 0%, var(--forest-700) 100%)`,
        }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
            <AnimalGlyph kind={sp.glyph} size={120} color="rgba(255,255,255,0.4)"/>
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, rgba(6,20,13,0.4) 100%)" }}/>
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="tag" style={{ background: "rgba(6,20,13,0.5)", color: "var(--bone-50)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
              <AnimalGlyph kind={sp.glyph} size={11} color="currentColor"/>
              {lang === "fr" ? sp.frSing : sp.enSing}
            </span>
            <span className="tag" style={{ background: "rgba(6,20,13,0.5)", color: "var(--bone-50)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColor }}/>
              {statusLbl}
            </span>
            {animal.withdrawal && (
              <span className="tag pulse-critical" style={{ background: "var(--rust-700)", color: "var(--bone-50)", border: 0 }}>
                <Icon name="shield" size={10} color="currentColor"/>
                {lang === "fr" ? "Retrait" : "Withdrawal"}
              </span>
            )}
          </div>
          <button style={{
            position: "absolute", bottom: 12, right: 12,
            width: 38, height: 38, borderRadius: 999, border: 0,
            background: "rgba(6,20,13,0.6)", color: "var(--bone-50)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}>
            <Icon name="plus" size={16} color="currentColor"/>
          </button>
        </div>

        {/* Info */}
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink-950)" }}>
            {animal.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 2 }}>
            {animal.race} · {animal.sex} · {animal.weight} kg
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>
            {animal.lot} · {animal.barn}
          </div>
          <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--bg-sunken)", borderRadius: 8, fontSize: 12, color: "var(--ink-700)" }}>
            <Icon name="clock" size={11} color="var(--fg-3)"/>
            <span style={{ marginLeft: 6 }}>{animal.lastEvent}</span>
          </div>
        </div>
      </div>

      {/* Action grid */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-3)", gap: 8 }}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto}/>
        {actions.map((a) => (
          <button key={a.id} onClick={() => {
            if (a.id === "photo") fileRef.current && fileRef.current.click();
            else if (a.event) {
              const ctx = {
                tab: a.event,
                animalId: animal._pk ?? null,
                animalExternal: animal.id ?? null,
                species: animal.species,
                productKind: a.id === "weight" ? "growth" : a.id === "milk" ? "milk" : null,
              };
              window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: ctx }));
            }
            else if (a.id === "view") onNav && onNav("animals");
          }} className="card" style={{
            padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
            cursor: "pointer", textAlign: "center", border: "1px solid var(--border-1)",
            background: "var(--paper)", transition: "all 120ms",
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: `color-mix(in oklch, ${a.color} 12%, transparent)`, color: a.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={a.icon} size={17} color="currentColor"/>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-800)", letterSpacing: "-0.005em", lineHeight: 1.25 }}>
              {lang === "fr" ? a.fr : a.en}
            </span>
          </button>
        ))}
      </div>

      <button onClick={onClose} className="btn" style={{ height: 44, width: "100%", justifyContent: "center", marginTop: 4 }}>
        <Icon name="scanLine" size={14} color="var(--ink-700)"/>
        {lang === "fr" ? "Scanner un autre animal" : "Scan another animal"}
      </button>
    </div>
  );
};

function methodName(m, lang) {
  const n = {
    qr: { fr: "QR code", en: "QR code" },
    scanner: { fr: "code-barre", en: "barcode" },
    rfid: { fr: "RFID", en: "RFID" },
    face: { fr: "reconnaissance faciale", en: "face recognition" },
    photo: { fr: "capture photo", en: "photo capture" },
    manual: { fr: "saisie manuelle", en: "manual entry" },
  };
  return n[m] ? n[m][lang] : m;
}

// Petit bandeau d'état pour la reco faciale : modèle/indexation/prêt/erreur.
const FaceStatusBar = ({ lang, face, onRetry }) => {
  const palette = {
    idle:     { bg: "var(--bg-sunken)", fg: "var(--ink-700)" },
    loading:  { bg: "var(--autorite-50)", fg: "var(--autorite-900)" },
    indexing: { bg: "var(--autorite-50)", fg: "var(--autorite-900)" },
    ready:    { bg: "var(--solidite-50)", fg: "var(--solidite-900)" },
    empty:    { bg: "var(--bg-sunken)", fg: "var(--fg-2)" },
    error:    { bg: "var(--oxblood-50)", fg: "var(--oxblood-800)" },
  }[face.state] || { bg: "var(--bg-sunken)", fg: "var(--ink-700)" };
  const msg = (() => {
    if (face.state === "loading") return lang === "fr" ? "Chargement du modèle (MobileNet)…" : "Loading model (MobileNet)…";
    if (face.state === "indexing") {
      const p = face.progress || { done: 0, total: 0 };
      return (lang === "fr" ? "Indexation des photos… " : "Indexing photos… ") + `${p.done}/${p.total}`;
    }
    if (face.state === "ready") return lang === "fr"
      ? `Reco prête (${face.index.animals.length} animaux indexés, seuil 78 %).`
      : `Recog ready (${face.index.animals.length} animals indexed, threshold 78%).`;
    if (face.state === "empty") return lang === "fr"
      ? "Aucune photo en base — ajoute des photos sur les fiches animaux pour entraîner la reco."
      : "No photos on file — add photos on animal pages to enroll faces.";
    if (face.state === "error") return (lang === "fr" ? "Erreur : " : "Error: ") + (face.error || "—");
    return lang === "fr" ? "Initialisation…" : "Initializing…";
  })();
  return (
    <div style={{
      background: palette.bg, color: palette.fg,
      padding: "8px 12px", borderRadius: 8,
      display: "flex", alignItems: "center", gap: 8, fontSize: 12,
    }}>
      <Icon name={face.state === "ready" ? "check" : face.state === "error" ? "alert" : "sparkle"} size={14} color="currentColor"/>
      <span style={{ flex: 1 }}>{msg}</span>
      {(face.state === "error" || face.state === "empty") && (
        <button onClick={onRetry} className="btn btn-sm" style={{ background: "transparent", border: `1px solid ${palette.fg}`, color: palette.fg, padding: "2px 8px", fontSize: 11 }}>
          {lang === "fr" ? "Réessayer" : "Retry"}
        </button>
      )}
    </div>
  );
};

export { Identification };
