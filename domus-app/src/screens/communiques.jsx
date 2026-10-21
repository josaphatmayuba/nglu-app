// Écran « Communiqués » — SMS envoyés en masse aux locataires (tout un immeuble
// ou une sélection). L'envoi est asynchrone côté serveur : le modal suit
// l'avancement par polling de GET /announcements/:id jusqu'au statut « done ».
import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, Plus, Send, Eye, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Modal } from "./biens.jsx";
import { useConfirm } from "../components/Dialog.jsx";

const MAX_LEN = 480;
const BIG_AUDIENCE = 50;
const touch = { minHeight: 44 };

// Jeu GSM 7 bits (de base) ; les caractères d'extension comptent double.
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

export function smsInfo(text) {
  const s = String(text || "");
  let septets = 0;
  let unicode = false;
  for (const ch of s) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXT.includes(ch)) septets += 2;
    else { unicode = true; break; }
  }
  const units = unicode ? [...s].length : septets;
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  return { unicode, units, segments };
}

const MAX_SELECTION = 300;
const POLL_MS = 2500;
const POLL_MAX_MS = 5 * 60 * 1000; // arrêt du suivi après ~5 min
const REASONS = { no_phone: "Pas de téléphone", invalid_phone: "Numéro invalide" };
const STATUS = { queued: "En attente", sending: "Envoi en cours", done: "Terminé" };
const LOG_STATUS = { sent: "Envoyé", failed: "Échec", skipped: "Ignoré", pending: "En attente" };

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function leaseTenants(lease) {
  const principal = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ").trim() || lease.tenantName || t("Locataire");
  const out = [];
  if (lease.tenantId) out.push({ id: Number(lease.tenantId), name: principal, propertyId: lease.propertyId, propertyName: lease.propertyName });
  for (const c of Array.isArray(lease.coTenants) ? lease.coTenants : []) {
    if (c?.id) out.push({ id: Number(c.id), name: c.name || t("Locataire"), propertyId: lease.propertyId, propertyName: lease.propertyName });
  }
  return out;
}

export function AnnouncementModal({ presetPropertyId = null, onClose, onSent }) {
  const confirm = useConfirm();
  const [mode, setMode] = useState("property");
  const [propertyId, setPropertyId] = useState(presetPropertyId ? String(presetPropertyId) : "");
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [job, setJob] = useState(null); // annonce suivie après envoi
  const [stalled, setStalled] = useState(false); // suivi interrompu (erreur ou > 5 min)
  const timer = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const codeRef = useRef(null);

  const { data } = useApi(async () => {
    const [properties, leases, setting] = await Promise.all([
      api.properties().catch(() => []),
      api.leases().catch(() => []),
      api.setting().catch(() => null),
    ]);
    return { properties, leases, setting };
  }, []);

  const smsOff = data?.setting && data.setting.smsEnabled != null && Number(data.setting.smsEnabled) === 0;
  const properties = Array.isArray(data?.properties) ? data.properties : [];
  const tenants = useMemo(() => {
    const seen = new Map();
    for (const l of Array.isArray(data?.leases) ? data.leases : []) {
      if (l.status !== "active") continue;
      for (const x of leaseTenants(l)) if (!seen.has(x.id)) seen.set(x.id, x);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
  const shown = tenants.filter((x) => `${x.name} ${x.propertyName || ""}`.toLowerCase().includes(filter.trim().toLowerCase()));

  const info = smsInfo(message);
  const trimmed = message.trim();
  const target = mode === "property" ? (propertyId ? { propertyId: Number(propertyId) } : null) : (selected.length ? { tenantIds: selected } : null);
  const canSubmit = !!target && trimmed.length > 0 && trimmed.length <= MAX_LEN && !smsOff && !busy;

  useEffect(() => () => clearTimeout(timer.current), []);
  // Toute modification de cible ou de message invalide l'aperçu.
  useEffect(() => { setPreview(null); setConfirming(false); }, [mode, propertyId, selected]);

  // Apparition du bloc de confirmation : visible + focus (champ de saisie si gros envoi, sinon Annuler).
  useEffect(() => {
    if (!confirming) return;
    confirmRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    (codeRef.current || cancelRef.current)?.focus();
  }, [confirming]);

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_SELECTION ? cur : [...cur, id]));
  const selectAll = () => setSelected((cur) => [...new Set([...cur, ...shown.map((x) => x.id)])].slice(0, MAX_SELECTION));
  const clearAll = () => setSelected([]);
  const limitReached = selected.length >= MAX_SELECTION;

  const runPreview = async () => {
    if (!target) return;
    setBusy(true); setError("");
    try { setPreview(await api.announcementPreview(target)); }
    catch (e) { setError(e?.message || t("Erreur")); }
    finally { setBusy(false); }
  };

  const poll = (id) => {
    clearTimeout(timer.current);
    setStalled(false);
    const startedAt = Date.now();
    const tick = async () => {
      try {
        const a = await api.announcement(id);
        setJob(a);
        if (a.status === "done") onSent?.();
        else if (Date.now() - startedAt > POLL_MAX_MS) setStalled(true);
        else timer.current = setTimeout(tick, POLL_MS);
      } catch (e) {
        setError(e?.message || t("Erreur de suivi"));
        setStalled(true);
      }
    };
    tick();
  };

  const send = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.createAnnouncement({ ...target, message: trimmed });
      setConfirming(false);
      setJob({ id: res.id, status: "queued", recipientsCount: res.recipientsCount, sentCount: 0, failedCount: 0, skippedCount: 0 });
      poll(res.id);
    } catch (e) {
      setError(e?.message || t("Erreur"));
    } finally { setBusy(false); }
  };

  const askSend = async () => {
    setError("");
    let p = preview;
    if (!p) {
      setBusy(true);
      try { p = await api.announcementPreview(target); setPreview(p); }
      catch (e) { setError(e?.message || t("Erreur")); setBusy(false); return; }
      setBusy(false);
    }
    if (!p.count) { setError(t("Aucun destinataire avec un numéro valide.")); return; }
    setConfirmText("");
    setConfirming(true);
  };

  const resend = async () => {
    // Renvoi des echecs : le texte du communique est montre avant de confirmer.
    if (!(await confirm({ title: t("Renvoyer aux destinataires en échec"), message: tf(t("{n} SMS seront renvoyés avec ce texte : « {text} »"), { n: job.failedCount, text: message }), confirmLabel: t("Confirmer l'envoi") }))) return;
    setBusy(true); setError("");
    try { await api.resendAnnouncementFailed(job.id); setJob({ ...job, status: "sending" }); poll(job.id); }
    catch (e) { setError(e?.message || t("Erreur")); }
    finally { setBusy(false); }
  };

  const big = (preview?.count || 0) > BIG_AUDIENCE;
  const confirmOk = !big || confirmText.trim() === String(preview?.count);

  if (job) {
    const done = job.status === "done";
    return (
      <Modal title={t("Communiqué")} icon={<Megaphone size={18} />} onClose={onClose}>
        <div style={{ display: "grid", gap: 12 }}>
          <p aria-live="polite"><strong>{t(STATUS[job.status] || job.status)}</strong>{" — "}
            {tf(t("{n} destinataire(s)"), { n: job.recipientsCount })}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span className="immo-mini-badge success">{tf(t("{n} envoyé(s)"), { n: job.sentCount })}</span>
            <span className={`immo-mini-badge ${job.failedCount ? "danger" : "neutral"}`}>{tf(t("{n} échec(s)"), { n: job.failedCount })}</span>
            <span className="immo-mini-badge neutral">{tf(t("{n} ignoré(s)"), { n: job.skippedCount })}</span>
          </div>
          {error && <p role="alert" className="api-error">{error}</p>}
          {stalled && !done && <p className="muted">{t("Le suivi est interrompu. L'envoi continue côté serveur.")}</p>}
        </div>
        <div className="modal-actions">
          {stalled && !done && (
            <button className="btn" onClick={() => { setError(""); poll(job.id); }}><RefreshCw size={15} /> {t("Réessayer")}</button>
          )}
          {done && Number(job.failedCount) > 0 && (
            <button className="btn" style={touch} onClick={resend} disabled={busy}><RefreshCw size={15} /> {t("Renvoyer les échecs")}</button>
          )}
          <button className="btn btn-primary" style={touch} onClick={onClose}>{t("Fermer")}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t("Nouveau communiqué")} subtitle={t("SMS envoyé aux locataires actifs")} icon={<Megaphone size={18} />} onClose={onClose}>
      {smsOff && (
        <div role="alert" className="immo-callout-warning" style={{ marginBottom: 12 }}>
          <AlertTriangle size={16} /> {t("Envoi de SMS désactivé dans les réglages")}
        </div>
      )}
      <div style={{ display: "grid", gap: 14 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <legend className="field" style={{ marginBottom: 6 }}><span>{t("Destinataires")}</span></legend>
          {[["property", "Tout un immeuble"], ["selection", "Locataires choisis"]].map(([k, label]) => (
            <label key={k} style={{ ...touch, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
              <input type="radio" name="announce-mode" checked={mode === k} onChange={() => setMode(k)} /> {t(label)}
            </label>
          ))}
        </fieldset>

        {mode === "property" ? (
          <label className="field">
            <span>{t("Immeuble")}</span>
            <select style={touch} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">{t("Choisir un immeuble")}</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <label className="field">
              <span>{t("Filtrer les locataires")}</span>
              <input style={touch} type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("Nom ou immeuble")} />
            </label>
            <div role="group" aria-label={t("Locataires")} style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              {shown.length === 0 && (
                <p style={{ padding: 12 }}><Search size={14} /> {tenants.length === 0 ? t("Aucun bail actif") : t("Aucun résultat")}</p>
              )}
              {shown.map((x) => (
                <label key={x.id} style={{ ...touch, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", borderBottom: "1px solid var(--border)" }}>
                  <input type="checkbox" checked={selected.includes(x.id)} onChange={() => toggle(x.id)} />
                  <span>{x.name}{x.propertyName ? <span className="muted"> — {x.propertyName}</span> : null}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button type="button" className="btn" style={touch} onClick={selectAll} disabled={!shown.length || limitReached}>{t("Tout sélectionner")}</button>
              <button type="button" className="btn" style={touch} onClick={clearAll} disabled={!selected.length}>{t("Effacer")}</button>
              <span className="muted" style={{ fontSize: 12 }}>{tf(t("{n} sélectionné(s) (max 300)"), { n: selected.length })}</span>
            </div>
            {limitReached && <p role="status" className="muted" style={{ fontSize: 12 }}>{t("Limite de 300 locataires atteinte.")}</p>}
          </div>
        )}

        <label className="field">
          <span>{t("Message")}</span>
          <textarea rows={5} maxLength={MAX_LEN} value={message} aria-describedby="announce-counter"
            onChange={(e) => { setMessage(e.target.value); setConfirming(false); }} />
          <span id="announce-counter" aria-live="polite" style={{ fontWeight: 500 }}>
            {message.length}/{MAX_LEN} · {tf(t("{n} SMS"), { n: info.segments })}
            {info.unicode ? ` · ${t("caractères spéciaux (70 par SMS)")}` : ""}
          </span>
        </label>

        {error && <p role="alert" className="api-error">{error}</p>}

        {preview && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }} aria-live="polite">
            <strong>{tf(t("{n} destinataire(s) recevront le SMS"), { n: preview.count })}</strong>
            {preview.duplicates > 0 && (
              <p className="muted" style={{ marginTop: 8 }}>{tf(t("{n} doublon(s) ignoré(s) (même numéro)"), { n: preview.duplicates })}</p>
            )}
            {preview.excluded?.length > 0 && (
              <>
                <p style={{ marginTop: 8 }}>{tf(t("{n} exclu(s) :"), { n: preview.excluded.length })}</p>
                <ul style={{ margin: "4px 0 0 18px" }}>
                  {preview.excluded.map((x) => <li key={x.tenantId}>{x.name} — {t(REASONS[x.reason] || x.reason)}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        {confirming && (
          <div ref={confirmRef} role="alertdialog" aria-label={t("Confirmation d'envoi")} className="immo-callout-warning block">
            <strong>{tf(t("Envoyer ce SMS à {n} destinataire(s) ? Action irréversible."), { n: preview.count })}</strong>
            {big && (
              <label className="field">
                <span>{tf(t("Saisissez {n} pour confirmer"), { n: preview.count })}</span>
                <input ref={codeRef} style={touch} inputMode="numeric" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </label>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button ref={cancelRef} className="btn" style={touch} onClick={() => setConfirming(false)} disabled={busy}>{t("Annuler")}</button>
              <button className="btn btn-primary" style={touch} onClick={send} disabled={busy || !confirmOk}>
                <Send size={15} /> {busy ? t("Envoi...") : t("Confirmer l'envoi")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="modal-actions" style={{ flexWrap: "wrap" }}>
        <button className="btn" style={touch} onClick={onClose}>{t("Annuler")}</button>
        <button className="btn" style={touch} onClick={runPreview} disabled={!target || busy}><Eye size={15} /> {t("Aperçu")}</button>
        <button className="btn btn-primary" style={touch} onClick={askSend} disabled={!canSubmit || confirming}>
          <Send size={15} /> {t("Envoyer")}
        </button>
      </div>
    </Modal>
  );
}

export function Communiques() {
  const { data, loading, error, reload } = useApi(async () => {
    const [list, properties] = await Promise.all([api.announcements(), api.properties().catch(() => [])]);
    return { list, properties };
  }, []);
  useRealtimeReload(reload, ["announcements"]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  if (loading && !data) return <Loading />;
  if (error) return <ApiError error={error} onRetry={reload} />;
  const list = Array.isArray(data?.list) ? data.list : [];
  const propName = (id) => (data?.properties || []).find((p) => Number(p.id) === Number(id))?.name;

  return (
    <div className="immo-page">
      <div className="immo-header">
        <div>
          <h1>{t("Communiqués")}</h1>
          <p>{t("SMS envoyés aux locataires")}</p>
        </div>
        <div className="immo-header-actions">
          <button className="immo-btn primary" style={touch} onClick={() => setOpen(true)}>
            <Plus size={16} /> {t("Nouveau communiqué")}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="immo-empty">
          <Megaphone size={28} />
          <h3>{t("Aucun communiqué")}</h3>
          <p>{t("Cliquez « Nouveau communiqué » pour prévenir vos locataires par SMS.")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((a) => (
            <button key={a.id} type="button" className="card" onClick={() => setDetail(a)}
              style={{ ...touch, textAlign: "left", padding: 14, display: "grid", gap: 6, cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                <strong>{a.propertyId ? (propName(a.propertyId) || t("Immeuble")) : t("Locataires choisis")}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{fmtDate(a.createdAt)}</span>
              </div>
              <span>{String(a.message).length > 120 ? `${String(a.message).slice(0, 120)}…` : a.message}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span className="immo-mini-badge success">{tf(t("{n} envoyé(s)"), { n: a.sentCount })}</span>
                <span className={`immo-mini-badge ${a.failedCount ? "danger" : "neutral"}`}>{tf(t("{n} échec(s)"), { n: a.failedCount })}</span>
                <span className="immo-mini-badge neutral">{tf(t("{n} ignoré(s)"), { n: a.skippedCount })}</span>
                <span className={`immo-mini-badge ${a.status === "done" ? "neutral" : "warning"}`}>{t(STATUS[a.status] || a.status)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <AnnouncementModal onClose={() => { setOpen(false); reload(); }} onSent={reload} />}
      {detail && <AnnouncementDetail announcement={detail} onClose={() => { setDetail(null); reload(); }} />}
    </div>
  );
}

function AnnouncementDetail({ announcement, onClose }) {
  const confirm = useConfirm();
  const [a, setA] = useState(announcement);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [stalled, setStalled] = useState(false);
  const timer = useRef(null);

  const load = async (startedAt = Date.now()) => {
    clearTimeout(timer.current);
    setStalled(false);
    try {
      const x = await api.announcement(announcement.id);
      setA(x);
      if (x.status === "done") return;
      if (Date.now() - startedAt > POLL_MAX_MS) setStalled(true);
      else timer.current = setTimeout(() => load(startedAt), POLL_MS);
    } catch (e) { setErr(e?.message || t("Erreur de suivi")); setStalled(true); }
  };
  useEffect(() => { load(); return () => clearTimeout(timer.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resend = async () => {
    // Renvoi des echecs : le texte du communique est montre avant de confirmer.
    if (!(await confirm({ title: t("Renvoyer aux destinataires en échec"), message: tf(t("{n} SMS seront renvoyés avec ce texte : « {text} »"), { n: a.failedCount, text: a.message }), confirmLabel: t("Confirmer l'envoi") }))) return;
    setBusy(true); setErr("");
    try { await api.resendAnnouncementFailed(a.id); load(); }
    catch (e) { setErr(e?.message || t("Erreur")); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={t("Communiqué")} subtitle={fmtDate(a.createdAt)} icon={<Megaphone size={18} />} onClose={onClose}>
      <p style={{ whiteSpace: "pre-wrap" }}>{a.message}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
        <span className="immo-mini-badge success">{tf(t("{n} envoyé(s)"), { n: a.sentCount })}</span>
        <span className={`immo-mini-badge ${a.failedCount ? "danger" : "neutral"}`}>{tf(t("{n} échec(s)"), { n: a.failedCount })}</span>
        <span className="immo-mini-badge neutral">{tf(t("{n} ignoré(s)"), { n: a.skippedCount })}</span>
        <span className="immo-mini-badge neutral">{t(STATUS[a.status] || a.status)}</span>
      </div>
      {err && <p role="alert" className="api-error">{err}</p>}
      {Array.isArray(a.logs) && a.logs.length > 0 && (
        <ul style={{ maxHeight: 220, overflow: "auto", margin: 0, paddingLeft: 18 }}>
          {a.logs.map((l) => (
            <li key={l.id}>
              {(l.tenantName || l.name) ? `${l.tenantName || l.name} · ` : ""}{l.recipient} — {t(LOG_STATUS[l.status] || l.status)}{l.errorMessage ? ` (${l.errorMessage})` : ""}
            </li>
          ))}
        </ul>
      )}
      <div className="modal-actions">
        {stalled && a.status !== "done" && (
          <button className="btn" onClick={() => { setErr(""); load(); }}><RefreshCw size={15} /> {t("Réessayer")}</button>
        )}
        {a.status === "done" && Number(a.failedCount) > 0 && (
          <button className="btn" style={touch} onClick={resend} disabled={busy}><RefreshCw size={15} /> {t("Renvoyer les échecs")}</button>
        )}
        <button className="btn btn-primary" style={touch} onClick={onClose}>{t("Fermer")}</button>
      </div>
    </Modal>
  );
}
