// Gestionnaire d'envois global (hors des modales) : file persistée IndexedDB,
// progression, retry automatique avec backoff, reprise au démarrage.
// Un envoi continue même si la modale est fermée ou si l'utilisateur change d'écran.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { useToast } from "../components/Dialog.jsx";
import { useAuthToken } from "../auth.jsx";
import { storeAll, storeClearMemory, storeDelete, storePut } from "./uploadStore.js";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // nginx client_max_body_size = 10m
const BACKOFF_MS = [5000, 15000, 30000, 60000, 60000, 60000];
const MAX_ATTEMPTS = BACKOFF_MS.length;
const DONE_VISIBLE_MS = 5000;
// Au-delà, un envoi resté en file n'est plus rejoué tout seul au démarrage (il pourrait écraser un scan plus récent).
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const UploadsContext = createContext(null);
const FALLBACK = { items: [], enqueueSignedContract: () => false, retry() {}, cancel() {}, itemForContract: () => null, subscribe: () => () => {} };

export function useUploads() {
  return useContext(UploadsContext) || FALLBACK;
}

// Abonnement au succès d'un envoi : cb({ contractId, leaseId, contract }).
export function useUploadSuccess(cb) {
  const { subscribe } = useUploads();
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => subscribe((evt) => ref.current?.(evt)), [subscribe]);
}

// Identite (user + organisation) lue dans le JWT en memoire : la file n'est rejouee que pour son proprietaire.
function identityFromToken(token) {
  try {
    const payload = JSON.parse(atob(String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload?.sub == null) return null;
    return { userId: payload.sub, orgId: payload.organizationId ?? null };
  } catch {
    return null;
  }
}

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const toView = (r) => ({
  id: r.id,
  contractId: r.contractId,
  leaseId: r.leaseId,
  ref: r.ref,
  status: r.status,
  progress: r.progress || 0,
  attempts: r.attempts || 0,
  error: r.error || "",
  serverError: !!r.serverError,
});

export function UploadsProvider({ children }) {
  const toast = useToast();
  const token = useAuthToken();
  const identity = useMemo(() => identityFromToken(token), [token]);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const identityKey = identity ? `${identity.userId}:${identity.orgId}` : "";
  const aliveRef = useRef(true);
  const abortersRef = useRef(new Map()); // id -> AbortController
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const recordsRef = useRef(new Map()); // id -> enregistrement complet (avec File)
  const timersRef = useRef(new Map());
  const runningRef = useRef(new Set());
  const listenersRef = useRef(new Set());
  const [items, setItems] = useState([]);

  const sync = useCallback(() => aliveRef.current && setItems([...recordsRef.current.values()].map(toView)), []);
  const patch = useCallback((id, changes, persist = false) => {
    const rec = recordsRef.current.get(id);
    if (!rec || !aliveRef.current) return null;
    Object.assign(rec, changes);
    if (persist) storePut({ ...rec }).catch(() => {});
    sync();
    return rec;
  }, [sync]);
  const remove = useCallback((id) => {
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    recordsRef.current.delete(id);
    storeDelete(id).catch(() => {});
    sync();
  }, [sync]);

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const start = useCallback(async (id) => {
    const rec = recordsRef.current.get(id);
    if (!aliveRef.current || !rec || runningRef.current.has(id)) return;
    clearTimeout(timersRef.current.get(id));
    if (isOffline()) {
      patch(id, { status: "waiting_network", serverError: false }, true);
      return;
    }
    runningRef.current.add(id);
    const controller = new AbortController();
    abortersRef.current.set(id, controller);
    patch(id, { status: "uploading", progress: 0, error: "" }, true);
    try {
      let updated = await api.markContractSignedManually(rec.contractId, rec.file, (p) => patch(id, { progress: p }), controller.signal, { replace: rec.replace === true, expectedDocumentId: rec.expectedDocumentId ?? null });
      abortersRef.current.delete(id);
      runningRef.current.delete(id);
      if (!aliveRef.current) return;
      if (!updated || typeof updated !== "object") {
        // Reponse 2xx non JSON : on relit le contrat pour mettre l'ecran a jour.
        updated = await api.contract(rec.contractId).catch(() => null);
      }
      patch(id, { status: "done", progress: 100 });
      storeDelete(id).catch(() => {});
      if (rec.replace && updated && updated.replaced === false) {
        // Remplacement demande avec le meme fichier que le scan actuel : rien n'a change.
        toastRef.current?.info?.(t("Fichier identique au scan actuel, rien n'a été remplacé."));
      } else {
        toastRef.current?.success?.(rec.replace ? t("Scan signé remplacé") : t("Bail signé importé"));
      }
      listenersRef.current.forEach((fn) => {
        try { fn({ contractId: rec.contractId, leaseId: rec.leaseId, contract: updated }); } catch {}
      });
      timersRef.current.set(id, setTimeout(() => remove(id), DONE_VISIBLE_MS));
    } catch (err) {
      abortersRef.current.delete(id);
      runningRef.current.delete(id);
      const current = recordsRef.current.get(id);
      if (!aliveRef.current || !current) return;
      if (err?.aborted) {
        // Annulation utilisateur d'un envoi en cours : on retire l'element.
        remove(id);
        return;
      }
      const retriable = err?.retriable === true;
      const attempts = (current.attempts || 0) + 1;
      if (retriable && attempts < MAX_ATTEMPTS) {
        // En ligne = le serveur a echoue (5xx, reponse vide), pas le reseau du navigateur.
        patch(id, { status: "waiting_network", serverError: !isOffline(), attempts, error: err?.message || "" }, true);
        if (!isOffline()) {
          timersRef.current.set(id, setTimeout(() => start(id), BACKOFF_MS[attempts - 1]));
        }
      } else {
        // Echec serveur repete : message clair plutot que le texte brut du serveur (« Service Unavailable »).
        const message = retriable && !isOffline() ? t("Serveur indisponible. Réessayez plus tard.") : (err?.message || t("Import de la signature impossible."));
        patch(id, { status: "failed", attempts, retriable, error: message }, true);
      }
    }
  }, [patch, remove]);

  const enqueueSignedContract = useCallback((file, { contractId, leaseId, ref, replace = false, expectedDocumentId = null }) => {
    for (const r of [...recordsRef.current.values()]) {
      if (r.contractId !== contractId || r.status === "done") continue;
      // Un envoi en echec ne bloque pas un nouveau fichier : il est remplace.
      if (r.status === "failed") { recordsRef.current.delete(r.id); storeDelete(r.id).catch(() => {}); continue; }
      return false;
    }
    const id = `signed-${contractId}-${Date.now()}`;
    const owner = identityRef.current;
    if (!owner) return false;
    const rec = { id, kind: "signed-contract", replace: replace === true, expectedDocumentId: replace ? (expectedDocumentId ?? null) : null, createdAt: Date.now(), userId: owner.userId, orgId: owner.orgId, retriable: false, contractId, leaseId: leaseId ?? null, ref: ref || "", file, status: "queued", progress: 0, attempts: 0, error: "" };
    recordsRef.current.set(id, rec);
    storePut({ ...rec }).catch(() => {});
    sync();
    start(id);
    return true;
  }, [start, sync]);

  const retry = useCallback((id) => {
    patch(id, { attempts: 0, error: "", status: "queued" }, true);
    start(id);
  }, [patch, start]);
  const cancel = useCallback((id) => {
    const controller = abortersRef.current.get(id);
    if (controller) { controller.abort(); return; }
    remove(id);
  }, [remove]);

  // Reprise au démarrage (le provider n'est monté que pour un utilisateur authentifié).
  useEffect(() => {
    let alive = true;
    if (!identity) return undefined;
    storeAll().then((rows) => {
      if (!alive || !aliveRef.current) return;
      for (const r of rows || []) {
        if (!r?.id) continue;
        // Enregistrement d'un autre utilisateur / organisation (ou sans proprietaire) : purge, jamais rejoue ni affiche.
        if (r.userId !== identity.userId || r.orgId !== identity.orgId || !r.file) {
          if (!recordsRef.current.has(r.id)) storeDelete(r.id).catch(() => {});
          continue;
        }
        if (recordsRef.current.has(r.id)) continue;
        // Un contrat deja en file (meme contractId) n'est pas duplique.
        if ([...recordsRef.current.values()].some((x) => x.contractId === r.contractId)) continue;
        // Envoi trop ancien (ou d'avant la date d'enregistrement) : pas de reprise auto, l'utilisateur décide.
        const stale = r.status !== "failed" && !(Number(r.createdAt) > Date.now() - STALE_AFTER_MS);
        recordsRef.current.set(r.id, stale
          ? { ...r, progress: 0, status: "failed", retriable: false, error: t("Envoi interrompu depuis plus de 24 h. Vérifiez le scan actuel avant de relancer.") }
          : { ...r, progress: 0, status: r.status === "failed" ? "failed" : "queued" });
        if (stale) storePut({ ...recordsRef.current.get(r.id) }).catch(() => {});
      }
      sync();
      for (const r of [...recordsRef.current.values()]) if (r.status === "queued") start(r.id);
    }).catch(() => {});
    return () => { alive = false; };
  }, [start, sync, identityKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retour réseau : relance immédiate des envois en attente ; hors ligne : pause.
  useEffect(() => {
    const onOnline = () => {
      for (const r of [...recordsRef.current.values()]) {
        if (r.status === "waiting_network" || (r.status === "failed" && r.retriable)) {
          clearTimeout(timersRef.current.get(r.id));
          start(r.id);
        }
      }
    };
    const onOffline = () => {
      for (const r of [...recordsRef.current.values()]) {
        if (r.status === "queued") patch(r.id, { status: "waiting_network" });
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [start, patch]);

  // Demontage / deconnexion : plus aucun envoi ni timer ; annulation des XHR en cours ; memoire purgee.
  useEffect(() => {
    aliveRef.current = true;
    const timers = timersRef.current;
    const aborters = abortersRef.current;
    return () => {
      aliveRef.current = false;
      timers.forEach((h) => clearTimeout(h));
      aborters.forEach((c) => c.abort());
      storeClearMemory();
    };
  }, []);

  // Changement d'utilisateur sans demontage : on vide l'etat de l'ancien compte.
  useEffect(() => {
    return () => {
      timersRef.current.forEach((h) => clearTimeout(h));
      abortersRef.current.forEach((c) => c.abort());
      recordsRef.current.clear();
      storeClearMemory();
      setItems([]);
    };
  }, [identityKey]);

  const itemForContract = useCallback((contractId) => items.find((i) => i.contractId === contractId && i.status !== "done") || null, [items]);
  const value = useMemo(
    () => ({ items, enqueueSignedContract, retry, cancel, itemForContract, subscribe }),
    [items, enqueueSignedContract, retry, cancel, itemForContract, subscribe],
  );

  return (
    <UploadsContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" && items.length > 0 && createPortal(<UploadsPanel items={items} onRetry={retry} onCancel={cancel} />, document.body)}
    </UploadsContext.Provider>
  );
}

export function uploadStatusText(item) {
  switch (item.status) {
    case "uploading": return item.progress >= 100 ? t("Traitement…") : tf("Envoi {pct} %", { pct: item.progress });
    case "waiting_network": return item.serverError ? t("Serveur indisponible, nouvel essai bientôt…") : t("En attente de connexion…");
    case "done": return t("✓ Signé");
    case "failed": return t("Échec");
    default: return t("En file d'attente…");
  }
}

// Barre de progression linéaire + état (aucun spinner).
export function UploadProgress({ item }) {
  const pct = item.status === "done" ? 100 : item.status === "uploading" ? item.progress : 0;
  return (
    <div className="domus-upload-progress">
      <div className="domus-upload-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span className={item.status} style={{ width: `${pct}%` }} />
      </div>
      <span className="domus-upload-state">{uploadStatusText(item)}</span>
    </div>
  );
}

function UploadsPanel({ items, onRetry, onCancel }) {
  return (
    <div className="domus-uploads-panel" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`domus-upload-row ${item.status}`}>
          <div className="domus-upload-ref">{item.ref || tf("Contrat {id}", { id: item.contractId })}</div>
          <UploadProgress item={item} />
          {item.status === "failed" && (
            <div className="domus-upload-actions">
              {item.error && <span className="domus-upload-error">{item.error}</span>}
              <button type="button" className="immo-btn" onClick={() => onRetry(item.id)}>{t("Réessayer")}</button>
              <button type="button" className="immo-btn" onClick={() => onCancel(item.id)}>{t("Annuler")}</button>
            </div>
          )}
          {(item.status === "queued" || item.status === "waiting_network") && (
            <div className="domus-upload-actions">
              <button type="button" className="immo-btn" onClick={() => onCancel(item.id)}>{t("Annuler")}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
