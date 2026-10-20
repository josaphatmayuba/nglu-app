// Dialogs applicatifs partagés — remplacent window.confirm / alert / prompt.
// Réutilise le <Modal> partagé (screens/biens.jsx) et les classes CSS modal-*.
//
// Usage :
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message }))) return;
//   const toast = useToast();
//   toast.success("Envoyé.");  toast.error(e.message);
//   const prompt = usePrompt();
//   const val = await prompt({ title, label, defaultValue });  // null si annulé
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, CheckCircle2, XCircle, Copy, MessageSquare } from "lucide-react";
import { Modal } from "../screens/biens.jsx";
import { t, tf } from "../i18n.js";

const DialogContext = createContext(null);

export function useDialogs() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs must be used inside <DialogProvider>");
  return ctx;
}
export const useConfirm = () => useDialogs().confirm;
export const usePrompt = () => useDialogs().prompt;
export const useToast = () => useDialogs().toast;
// Aperçu obligatoire avant un envoi SMS :
//   const smsSend = useSmsSend();
//   const res = await smsSend((extra) => api.remindLease(id, targets, extra), { title });
//   if (!res) return; // annulé
// `send(extra)` est appelé avec { preview: true } (aperçu serveur, rien ne part),
// puis avec { previewHash } à la confirmation : le serveur refuse si le texte a changé.
export const useSmsSend = () => useDialogs().smsSend;

let toastSeq = 0;

export function DialogProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null); // { opts, resolve }
  const [promptState, setPromptState] = useState(null);   // { opts, resolve }
  const [smsState, setSmsState] = useState(null);         // { send, opts, resolve, reject }
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const confirm = useCallback(
    (opts = {}) => new Promise((resolve) => setConfirmState({ opts, resolve })),
    []
  );
  const promptFn = useCallback(
    (opts = {}) => new Promise((resolve) => setPromptState({ opts, resolve })),
    []
  );
  const smsSend = useCallback(
    (send, opts = {}) => new Promise((resolve, reject) => setSmsState({ send, opts, resolve, reject })),
    []
  );

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (message, tone) => {
      if (message == null || message === "") return;
      const id = ++toastSeq;
      setToasts((list) => [...list, { id, message: String(message), tone }]);
      timers.current[id] = setTimeout(() => dismiss(id), tone === "error" ? 6000 : 4000);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      show: (m) => pushToast(m, "info"),
      info: (m) => pushToast(m, "info"),
      success: (m) => pushToast(m, "success"),
      error: (m) => pushToast(m, "error"),
    }),
    [pushToast]
  );

  const value = useMemo(() => ({ confirm, prompt: promptFn, smsSend, toast }), [confirm, promptFn, smsSend, toast]);

  const closeConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };
  const closePrompt = (result) => {
    promptState?.resolve(result);
    setPromptState(null);
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      {confirmState &&
        createPortal(
          <ConfirmDialog opts={confirmState.opts} onClose={closeConfirm} />,
          document.body
        )}
      {promptState &&
        createPortal(
          <PromptDialog opts={promptState.opts} onClose={closePrompt} />,
          document.body
        )}
      {smsState &&
        createPortal(
          <SmsSendDialog
            state={smsState}
            onDone={(result, error) => {
              if (error) smsState.reject(error);
              else smsState.resolve(result);
              setSmsState(null);
            }}
          />,
          document.body
        )}
      {toasts.length > 0 &&
        createPortal(
          <div className="domus-toast-host">
            {toasts.map((x) => (
              <ToastItem key={x.id} toast={x} onDismiss={() => dismiss(x.id)} />
            ))}
          </div>,
          document.body
        )}
    </DialogContext.Provider>
  );
}

function ConfirmDialog({ opts, onClose }) {
  const {
    title = t("Confirmer"),
    message = "",
    confirmLabel = t("OK"),
    cancelLabel = t("Annuler"),
    danger = false,
  } = opts;
  return (
    <Modal
      title={title}
      icon={<AlertTriangle size={20} color={danger ? "#dc2626" : undefined} />}
      className="domus-confirm-modal"
      onClose={() => onClose(false)}
    >
      {message && <p className="domus-dialog-message">{message}</p>}
      <div className="modal-actions">
        <button className="btn" onClick={() => onClose(false)}>{cancelLabel}</button>
        <button
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          autoFocus
          onClick={() => onClose(true)}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function PromptDialog({ opts, onClose }) {
  const {
    title = "",
    label = "",
    message = "",
    defaultValue = "",
    confirmLabel = t("OK"),
    cancelLabel = t("Annuler"),
    readOnly = false,
    copyable = false,
  } = opts;
  const [val, setVal] = useState(defaultValue);
  const copy = () => navigator.clipboard?.writeText(val);
  return (
    <Modal
      title={title}
      icon={<Info size={20} />}
      className="domus-prompt-modal"
      onClose={() => onClose(null)}
    >
      {message && <p className="domus-dialog-message">{message}</p>}
      <div className="domus-dialog-body">
        {label && <label className="domus-dialog-label">{label}</label>}
        <div className="domus-dialog-input-row">
          <input
            autoFocus
            readOnly={readOnly}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === "Enter" && onClose(val)}
          />
          {copyable && (
            <button type="button" className="btn" onClick={copy} title={t("Copier")}>
              <Copy size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={() => onClose(null)}>{cancelLabel}</button>
        <button className="btn btn-primary" onClick={() => onClose(val)}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

function SmsSendDialog({ state, onDone }) {
  const { send, opts } = state;
  const { title = t("Vérifier le SMS avant l'envoi") } = opts;
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const sentRef = useRef(false);

  const load = useCallback(async () => {
    setPreview(null);
    try {
      setPreview(await send({ preview: true }));
    } catch (e) {
      onDone(null, e);
    }
  }, [send]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);

  const confirmSend = async () => {
    if (sentRef.current || !preview) return; // anti double-clic
    sentRef.current = true;
    setBusy(true);
    try {
      onDone(await send({ previewHash: preview.hash }));
    } catch (e) {
      sentRef.current = false;
      setBusy(false);
      if (e?.status === 409) {
        // Le texte a changé entre l'aperçu et l'envoi : rien n'est parti, on remontre le nouveau.
        setNotice(t("Le message a changé depuis l'aperçu. Vérifiez le nouveau texte puis confirmez."));
        load();
      } else {
        onDone(null, e);
      }
    }
  };

  const messages = preview?.messages || [];
  const missing = preview?.missing || [];
  const first = messages[0];
  const sameText = messages.every((m) => m.text === first?.text);
  const shown = showAll ? messages : messages.slice(0, 1);
  const totalSegments = messages.reduce((s, m) => s + (m.segments || 0), 0);

  return (
    <Modal
      title={title}
      icon={<MessageSquare size={20} />}
      className="domus-sms-modal"
      onClose={() => !busy && onDone(null)}
    >
      <div className="domus-dialog-body domus-sms-body">
        {!preview && <p className="domus-dialog-message">{t("Préparation de l'aperçu…")}</p>}
        {notice && <p className="domus-sms-banner domus-sms-banner-warn" role="alert">{notice}</p>}
        {preview?.smsDisabled && (
          <p className="domus-sms-banner domus-sms-banner-warn" role="status">
            {t("L'envoi de SMS est désactivé dans les réglages : les SMS seront notés « ignorés » et ne partiront pas.")}
          </p>
        )}
        {preview && messages.length === 0 && (
          <p className="domus-dialog-message">{t("Aucun SMS ne sera envoyé (les emails éventuels partent quand même).")}</p>
        )}
        {messages.length > 0 && (
          <p className="domus-sms-summary">
            {messages.length === 1
              ? t("1 SMS sera envoyé")
              : tf("{n} SMS seront envoyés", { n: messages.length })}
            {" · "}
            {tf("{n} segment(s) facturé(s)", { n: totalSegments })}
          </p>
        )}
        {shown.map((m, i) => (
          <div className="domus-sms-item" key={i}>
            <div className="domus-sms-to">
              <strong>{m.label || t("Destinataire")}</strong>
              <span>{m.phone}</span>
            </div>
            {(showAll || i === 0) && (
              <div className="domus-sms-bubble">{m.text}</div>
            )}
            <div className="domus-sms-meta">
              {tf("{c} caractères · {s} SMS", { c: m.length, s: m.segments })}
              {m.unicode && ` · ${t("caractères spéciaux : 70 par SMS")}`}
            </div>
          </div>
        ))}
        {messages.length > 1 && (
          <button type="button" className="btn domus-sms-toggle" onClick={() => setShowAll((v) => !v)}>
            {showAll
              ? t("Réduire")
              : sameText
                ? tf("Voir les {n} destinataires", { n: messages.length })
                : tf("Voir chaque message ({n})", { n: messages.length })}
          </button>
        )}
        {missing.length > 0 && (
          <div className="domus-sms-missing">
            <strong>{t("Ne recevront pas le SMS (pas de numéro) :")}</strong>
            <ul>{missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </div>
        )}
      </div>
      <div className="modal-actions domus-sms-actions">
        <button className="btn" autoFocus onClick={() => onDone(null)} disabled={busy}>{t("Annuler")}</button>
        <button
          className="btn btn-primary"
          onClick={confirmSend}
          disabled={!preview || busy}
        >
          {busy ? t("Envoi…") : t("Confirmer l'envoi")}
        </button>
      </div>
    </Modal>
  );
}

function ToastItem({ toast, onDismiss }) {
  const Icon =
    toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? XCircle : Info;
  return (
    <div className={`domus-toast domus-toast-${toast.tone}`} onClick={onDismiss} role="status">
      <Icon size={16} />
      <span>{toast.message}</span>
    </div>
  );
}
