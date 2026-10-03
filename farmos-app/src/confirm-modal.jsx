/* eslint-disable */
// Modale de confirmation de suppression réutilisable (remplace window.confirm pour les actions destructives).
// Style aligné sur les modales existantes de screens.jsx : backdrop rgba + card "paper", boutons btn/btn-sm.
import React from "react";
import { Icon } from "./icons";

// props :
//  - open          : bool, affiche la modale si true
//  - title         : string (optionnel) — titre de la card
//  - message       : string ou node — texte de confirmation (souvent identique à l'ancien message window.confirm)
//  - onConfirm     : () => void|Promise — appelé au clic sur le bouton de confirmation
//  - onCancel      : () => void — appelé au clic sur Annuler / backdrop / Escape
//  - lang          : "fr" | "en"
//  - danger        : bool (default true) — bouton de confirmation en rouge (oxblood)
//  - confirmLabel  : string (optionnel) — override du libellé du bouton confirmer
//  - cancelLabel   : string (optionnel) — override du libellé du bouton annuler
//  - busy          : bool (optionnel, contrôlé par l'appelant) — désactive les boutons + libellé "…"
export function ConfirmDeleteModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  lang = "fr",
  danger = true,
  confirmLabel,
  cancelLabel,
  busy: busyProp,
}) {
  const fr = lang === "fr";
  const [busySelf, setBusySelf] = React.useState(false);
  const busy = busyProp != null ? busyProp : busySelf;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (busy) return;
    if (busyProp == null) setBusySelf(true);
    try {
      await onConfirm?.();
    } finally {
      if (busyProp == null) setBusySelf(false);
    }
  };

  return (
    <div
      onClick={() => { if (!busy) onCancel?.(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--paper)", borderRadius: 12, width: "min(420px,100%)", padding: 20, border: "1px solid var(--border-1)" }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--oxblood-50, rgba(140,26,26,0.08))", color: "var(--oxblood-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="trash" size={17} color="var(--oxblood-700)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--ink-700)" }}>
              {title || (fr ? "Confirmer la suppression" : "Confirm deletion")}
            </h3>
            {message && (
              <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--ink-700)", lineHeight: 1.4 }}>
                {message}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-sm btn-ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel || (fr ? "Annuler" : "Cancel")}
          </button>
          <button
            className="btn btn-sm"
            disabled={busy}
            onClick={handleConfirm}
            style={danger ? { background: "var(--oxblood-700)", color: "#fff", borderColor: "var(--oxblood-700)" } : undefined}
          >
            {busy ? "…" : (confirmLabel || (fr ? "Supprimer" : "Delete"))}
          </button>
        </div>
      </div>
    </div>
  );
}
