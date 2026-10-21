// Modale « Résilier le bail » : date d'effet, motif obligatoire, récapitulatif
// (échéances annulées, impayés, caution) et SMS optionnel au(x) locataire(s).
import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, FileX, Shield, X } from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { moneyExact } from "../data.js";
import { useToast } from "../components/Dialog.jsx";

const REASON_MIN = 5;
const REASON_MAX = 2000;
const dayOf = (v) => String(v || "").slice(0, 10);
// Jour courant en UTC, comme l'API (formatDateOnly(new Date())).
const todayLocalISO = () => new Date().toISOString().slice(0, 10);
// Résiliation programmée : au plus tard aujourd'hui + 6 mois (miroir de TERMINATION_MAX_FUTURE_MONTHS côté API).
const MAX_FUTURE_MONTHS = 6;
const maxLocalISO = () => {
  // Même règle que l'API : setUTCMonth(+6) sans écrêtage.
  const d = new Date(`${todayLocalISO()}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + MAX_FUTURE_MONTHS);
  return d.toISOString().slice(0, 10);
};
const fmtDay = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : "");
const tenantLabel = (l) => [l.tenantFirstName, l.tenantLastName].filter(Boolean).join(" ") || l.tenantName || t("Locataire");
// Couches empilées au-dessus de cette modale (caution, état des lieux) : Échap ne ferme que celle du dessus.
const LAYERS = ".modal-layer, .immo-modal-scrim, .edl-screen";

export function TerminateLeaseModal({ lease, refreshKey = 0, onClose, onDone, onOpenDeposit, onOpenExitInspection }) {
  const toast = useToast();
  const today = todayLocalISO();
  const endDay = dayOf(lease.endDate);
  const maxDate = (() => { const m = maxLocalISO(); return endDay && endDay < m ? endDay : m; })();
  const minDate = dayOf(lease.startDate);
  const [date, setDate] = useState(() => (minDate && today < minDate ? minDate : today));
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(null); // null = pas encore choisi : suit la disponibilité d'un numéro
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const layerRef = useRef(null);
  const dateRef = useRef(null);
  const busyRef = useRef(false);
  const onCloseRef = useRef(onClose);
  busyRef.current = busy;
  onCloseRef.current = onClose;

  const dateFormatOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const dateValid = dateFormatOk && (!minDate || date >= minDate) && date <= maxDate;
  const scheduled = dateFormatOk && date > today;
  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  // Focus sur la date à l'ouverture, Échap ferme (sauf busy / modale enfant ouverte), focus rendu au déclencheur.
  useEffect(() => {
    const trigger = document.activeElement;
    dateRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== "Escape" || busyRef.current) return;
      const layers = document.querySelectorAll(LAYERS);
      if (layers.length && layers[layers.length - 1] !== layerRef.current) return;
      e.stopPropagation();
      onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (trigger && typeof trigger.focus === "function" && document.contains(trigger)) trigger.focus();
    };
  }, []);

  useEffect(() => {
    if (!dateValid) { setPreview(null); setPreviewError(""); return undefined; }
    let alive = true;
    setLoadingPreview(true);
    setPreviewError("");
    api.terminationPreview(lease.id, date)
      .then((p) => { if (alive) setPreview(p); })
      .catch((e) => { if (alive) { setPreview(null); setPreviewError(e?.message || t("Récapitulatif indisponible.")); } })
      .finally(() => { if (alive) setLoadingPreview(false); });
    return () => { alive = false; };
  }, [lease.id, date, dateValid, refreshKey, retry]);

  const hasPhone = useMemo(() => {
    if (preview?.sms) return preview.sms.recipientCount > 0;
    return Boolean(lease.tenantPhone) || (lease.coTenants || []).some((c) => c?.phone);
  }, [preview, lease]);
  const notifyChecked = notify === null ? hasPhone : notify && hasPhone;

  // Devise : symbole, sinon code ; sans aucune devise on masque le montant plutôt que d'afficher un nombre nu.
  const symbol = preview?.currency?.symbol || preview?.currency?.code || lease.currencySymbol || "";
  const amountText = (n, s = symbol) => (s ? moneyExact(n, s) : "");
  const countLine = (n, total) => {
    const base = tf(t("{n} échéance(s)"), { n });
    const m = amountText(total);
    return m ? `${base} · ${m}` : base;
  };

  const canSubmit = !busy && dateValid && reasonValid && Boolean(preview) && !loadingPreview;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.terminateLease(lease.id, {
        terminationDate: date,
        reason: trimmed,
        notifyTenant: notifyChecked,
      });
      if (res?.scheduled) {
        if (notifyChecked && res?.sms?.failed > 0) toast.error?.(t("Résiliation programmée, mais l'envoi du SMS a échoué pour au moins un locataire."));
        else toast.success?.(tf(t("Résiliation programmée le {date}."), { date: fmtDay(date) }));
      } else if (notifyChecked && res?.sms?.failed > 0) toast.error?.(t("Bail résilié, mais l'envoi du SMS a échoué pour au moins un locataire."));
      else toast.success?.(t("Bail résilié."));
      onDone?.(res);
    } catch (e) {
      setError(e?.message || t("Impossible de résilier le bail."));
    } finally {
      setBusy(false);
    }
  }

  const ids = {
    date: `term-date-${lease.id}`, dateErr: `term-date-err-${lease.id}`,
    reason: `term-reason-${lease.id}`, count: `term-count-${lease.id}`,
    notify: `term-notify-${lease.id}`, error: `term-error-${lease.id}`,
  };
  const dateError = dateValid
    ? ""
    : date > maxDate && dateFormatOk
      ? tf(t("La date doit être au plus tard le {max}."), { max: fmtDay(maxDate) })
      : tf(t("La date doit être le {min} ou après."), { min: fmtDay(minDate) });

  return (
    <div className="modal-layer" ref={layerRef} role="dialog" aria-modal="true" aria-labelledby={`term-title-${lease.id}`}>
      <div className="modal-scrim" onClick={busy ? undefined : onClose} />
      <div className="modal-card domus-terminate-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><FileX size={20} /></span>
            <div>
              <h2 id={`term-title-${lease.id}`}>{scheduled ? t("Programmer la résiliation") : t("Résilier le bail")}</h2>
              <p>{tenantLabel(lease)} · {[lease.propertyName || lease.propertyAddress, lease.unitName].filter(Boolean).join(" · ") || "—"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("Fermer")}><X size={18} /></button>
        </div>

        <div className="domus-property-form">
          <section className="domus-form-section">
            <label className="immo-field" htmlFor={ids.date}>
              <span>{t("Date d'effet")}</span>
              <input
                id={ids.date}
                ref={dateRef}
                type="date"
                value={date}
                min={minDate || undefined}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={!dateValid}
                aria-describedby={dateError ? ids.dateErr : undefined}
              />
            </label>
            {dateError && <p id={ids.dateErr} role="alert" className="domus-terminate-error">{dateError}</p>}

            <label className="immo-field" htmlFor={ids.reason}>
              <span>{t("Motif de la résiliation")} *</span>
              <textarea
                id={ids.reason}
                rows={4}
                maxLength={REASON_MAX}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("Ex. départ du locataire, impayés répétés, accord amiable…")}
                aria-required="true"
                aria-invalid={reason.length > 0 && !reasonValid}
                aria-describedby={ids.count}
              />
            </label>
            <small id={ids.count} className="domus-terminate-hint">
              {tf(t("{n}/{max} caractères (minimum {min}). Le motif reste interne : il n'est jamais envoyé au locataire."), { n: trimmed.length, max: REASON_MAX, min: REASON_MIN })}
            </small>
          </section>

          <section className="domus-form-section">
            <h3 className="domus-terminate-sub">{t("Récapitulatif")}</h3>
            {loadingPreview && <p role="status" aria-live="polite">{t("Calcul en cours…")}</p>}
            {previewError && (
              <div className="domus-terminate-retry">
                <p role="alert" className="domus-terminate-error">{previewError}</p>
                <button type="button" className="immo-btn" onClick={() => setRetry((n) => n + 1)} disabled={loadingPreview}>{t("Réessayer")}</button>
              </div>
            )}
            {preview && (
              <div className={loadingPreview ? "domus-terminate-recap is-loading" : "domus-terminate-recap"} aria-busy={loadingPreview}>
                <div className="immo-pay-row">
                  <span>{t("Échéances futures annulées")}</span>
                  <strong>{countLine(preview.futureCount, preview.futureTotal)}</strong>
                </div>
                <div className="immo-pay-row">
                  <span>{t("Impayés restant dus (avant cette date)")}</span>
                  <strong className={preview.unpaidCount > 0 ? "domus-terminate-warn" : undefined}>
                    {countLine(preview.unpaidCount, preview.unpaidTotal)}
                  </strong>
                </div>
                <div className="immo-pay-row">
                  <span>{t("Caution détenue")}</span>
                  {preview.deposit ? (
                    <strong>
                      {amountText(preview.deposit.amount, preview.deposit.currencySymbol || preview.deposit.currencyCode || symbol) || t("Oui")}
                    </strong>
                  ) : (
                    <strong>{t("Aucune")}</strong>
                  )}
                </div>
                <div className="domus-terminate-links">
                  {preview.deposit && (
                    <button type="button" className="immo-btn" onClick={() => onOpenDeposit?.(preview.deposit)}>
                      <Shield size={15} /> {t("Restituer la caution")}
                    </button>
                  )}
                  {onOpenExitInspection && (
                    <button type="button" className="immo-btn domus-terminate-secondary" onClick={onOpenExitInspection}>
                      <ClipboardCheck size={15} /> {t("État des lieux de sortie")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="domus-form-section">
            <label className="domus-terminate-check" htmlFor={ids.notify}>
              <input
                id={ids.notify}
                type="checkbox"
                checked={notifyChecked}
                disabled={!hasPhone}
                onChange={(e) => setNotify(e.target.checked)}
              />
              <span>{t("Prévenir le(s) locataire(s) par SMS")}</span>
            </label>
            {!hasPhone && <small className="domus-terminate-hint">{t("Aucun numéro de téléphone renseigné pour ce bail.")}</small>}
            {notifyChecked && preview?.sms?.message && (
              <blockquote className="domus-terminate-sms" aria-label={t("Aperçu du SMS")}>{preview.sms.message}</blockquote>
            )}
          </section>
        </div>

        {error && <p id={ids.error} role="alert" className="domus-terminate-error domus-terminate-error-box">{error}</p>}

        {scheduled ? (
          <p className="domus-terminate-final">
            {tf(t("Le bail reste actif jusqu'au {date} ; les échéances après cette date seront annulées automatiquement."), { date: fmtDay(date) })}
          </p>
        ) : (
          <p className="domus-terminate-final">{t("Cette action est définitive : le bail passera en Résilié et les échéances futures seront annulées.")}</p>
        )}

        <div className="domus-modal-footer">
          <button type="button" className="domus-modal-cancel" onClick={onClose} disabled={busy}>{t("Annuler")}</button>
          <button type="button" className="domus-modal-submit domus-terminate-submit" onClick={submit} disabled={!canSubmit}>
            <FileX size={14} /> {busy ? t("Résiliation…") : scheduled ? t("Programmer la résiliation") : t("Résilier")}
          </button>
        </div>
      </div>
    </div>
  );
}
