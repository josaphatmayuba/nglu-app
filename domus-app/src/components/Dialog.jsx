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
import { AlertTriangle, Info, CheckCircle2, XCircle, Copy } from "lucide-react";
import { Modal } from "../screens/biens.jsx";
import { t } from "../i18n.js";

const DialogContext = createContext(null);

export function useDialogs() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs must be used inside <DialogProvider>");
  return ctx;
}
export const useConfirm = () => useDialogs().confirm;
export const usePrompt = () => useDialogs().prompt;
export const useToast = () => useDialogs().toast;

let toastSeq = 0;

export function DialogProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null); // { opts, resolve }
  const [promptState, setPromptState] = useState(null);   // { opts, resolve }
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

  const value = useMemo(() => ({ confirm, prompt: promptFn, toast }), [confirm, promptFn, toast]);

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
