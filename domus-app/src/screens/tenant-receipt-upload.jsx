// Page publique minimaliste ouverte par le QR INDIVIDUEL de chaque quittance
// du carnet (/domus/quittance?token=...&pay=<id>) — contrairement au QR de
// couverture qui ouvre le dossier complet (TenantPortalPublic), ce QR ne doit
// montrer QUE la quittance visée : mois, montant, un bouton caméra, un bouton
// envoyer, rien d'autre. Le locataire scanne, confirme le mois, prend la
// photo, envoie, c'est fini.
import { useEffect, useRef, useState } from "react";
import { Building2, Loader2, CheckCircle2, Camera, Send, AlertTriangle } from "lucide-react";
import { publicApi } from "../api.js";
import { money } from "../data.js";
import { t } from "../i18n.js";

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Parse "YYYY-MM-..." par regex, jamais via `new Date()` : une date seule
// ("2026-09-01") serait lue comme minuit UTC, et un affichage dans un fuseau
// a l'ouest de Greenwich reculerait au mois precedent (meme piege deja
// documente dans rentBookUtils.js / tenant-portal-public.jsx).
function monthLabel(dateLike) {
  const m = /^(\d{4})-(\d{2})/.exec(String(dateLike || ""));
  if (!m) return "—";
  const monthIdx = Number(m[2]) - 1;
  return `${MONTHS_FR[monthIdx] || "—"} ${m[1]}`;
}

function PortalMark() {
  return (
    <div className="onb-brand on-dark">
      <div className="onb-brand-logo"><Building2 size={22} color="#fff" /></div>
      <span className="font-display onb-brand-name">Domus</span>
    </div>
  );
}

export function TenantReceiptUpload({ token, paymentId }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [fatal, setFatal] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !paymentId) { setFatal(t("Lien invalide ou manquant.")); setLoading(false); return; }
      try {
        const rec = await publicApi.tenantPaymentSummary(token, paymentId);
        if (!alive) return;
        setSummary(rec);
      } catch {
        if (alive) setFatal(t("Ce lien n'est plus valide ou a expiré."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, paymentId]);

  // Revoque l'URL de prévisualisation précédente à chaque changement/démontage
  // pour ne pas accumuler des blobs en mémoire sur une session longue.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const onFileChosen = (e) => {
    const picked = e.target.files?.[0] || null;
    e.target.value = "";
    if (!picked) return;
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  };

  const send = async () => {
    if (!file) return;
    setSending(true);
    setError("");
    try {
      await publicApi.uploadTenantPaymentProof(token, paymentId, file);
      setSent(true);
    } catch (err) {
      setError(err?.message || t("Envoi impossible."));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="onb-page">
        <div className="onb-state">
          <Loader2 className="domus-spin" size={36} />
          <p className="muted">{t("Chargement…")}</p>
        </div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="onb-page">
        <div className="onb-state">
          <PortalMark />
          <h1 style={{ marginTop: 18 }}>{t("Lien indisponible")}</h1>
          <p className="muted">{fatal}</p>
        </div>
      </div>
    );
  }

  // Blocage definitif uniquement quand le plafond d'envois (2, cf. backend
  // submitPaymentProof) est atteint — sinon le locataire garde un droit a
  // l'erreur (mauvais angle, flou) tant que canResend est vrai.
  const blocked = summary?.hasProof && summary?.canResend === false && !sent;

  return (
    <div className="onb-page">
      <div className="onb-shell" style={{ maxWidth: 420 }}>
        <header className="onb-hero">
          <PortalMark />
          <h1>{t("Quittance")} · {monthLabel(summary?.paymentDate)}</h1>
          {summary?.propertyName ? (
            <p>{[summary.propertyName, summary.unitName].filter(Boolean).join(" · ")}</p>
          ) : null}
        </header>

        <div className="onb-body">
          <section className="onb-card">
            <div className="onb-card-body" style={{ textAlign: "center", padding: "28px 20px" }}>
              <div style={{ fontSize: 28, fontWeight: 600 }}>
                {money(summary?.amount, summary?.currencySymbol || "CDF")}
              </div>
              <p className="muted" style={{ margin: "4px 0 0" }}>{monthLabel(summary?.paymentDate)}</p>
            </div>
          </section>

          {sent ? (
            <section className="onb-card">
              <div className="onb-card-body" style={{ textAlign: "center", padding: "28px 20px" }}>
                <CheckCircle2 size={36} color="#2f6e4e" />
                <p style={{ margin: "12px 0 0", fontWeight: 600 }}>{t("Photo envoyée.")}</p>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {t("Votre gestionnaire va vérifier ce paiement.")}
                </p>
              </div>
            </section>
          ) : blocked ? (
            <section className="onb-card">
              <div className="onb-card-body" style={{ textAlign: "center", padding: "28px 20px" }}>
                <CheckCircle2 size={36} color="#2f6e4e" />
                <p style={{ margin: "12px 0 0", fontWeight: 600 }}>{t("Une photo a déjà été envoyée pour cette quittance.")}</p>
              </div>
            </section>
          ) : summary?.hasProof && !file ? (
            // Photo deja envoyee mais 2e envoi encore permis : on confirme
            // d'abord (sinon le grand bouton camera laissait croire que rien
            // n'avait ete envoye) et le remplacement passe en action secondaire.
            <section className="onb-card">
              <div className="onb-card-body" style={{ textAlign: "center", padding: "28px 20px" }}>
                <CheckCircle2 size={36} color="#2f6e4e" />
                <p style={{ margin: "12px 0 0", fontWeight: 600 }}>{t("Photo déjà envoyée")}</p>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {t("Votre gestionnaire va la vérifier.")}
                </p>
                <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0 16px" }} />
                <p className="muted" style={{ fontSize: 13, margin: "0 0 10px" }}>{t("Photo floue ou mauvaise ?")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={onFileChosen}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", minHeight: 44,
                    borderRadius: 10, border: "1.5px solid #6366f1", background: "#fff", color: "#6366f1",
                    fontWeight: 600, fontSize: 14, cursor: "pointer",
                  }}
                >
                  <Camera size={16} /> {t("Remplacer la photo")}
                </button>
                <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 0" }}>{t("Il vous reste 1 envoi.")}</p>
              </div>
            </section>
          ) : (
            <section className="onb-card">
              <div className="onb-card-body" style={{ padding: 20 }}>
                {summary?.hasProof ? (
                  <p className="muted" style={{ fontSize: 13, margin: "0 0 14px", display: "flex", gap: 6, alignItems: "center" }}>
                    <AlertTriangle size={14} /> {t("Une photo a déjà été envoyée. En renvoyer une la remplacera.")}
                  </p>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={onFileChosen}
                />
                {/* Action principale de l'ecran (rien d'autre a faire avant) :
                    grande zone cliquable avec icone dominante, pas un petit
                    bouton texte qui se fondait dans la carte (signale par
                    l'utilisateur comme "trop grand et invisible"). */}
                {previewUrl ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    style={{ width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer", display: "block" }}
                  >
                    <img src={previewUrl} alt={t("Aperçu de la photo")} style={{ width: "100%", borderRadius: 10, display: "block" }} />
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, fontSize: 13, fontWeight: 600, color: "#6366f1" }}>
                      <Camera size={16} /> {t("Reprendre la photo")}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    style={{
                      width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                      padding: "36px 16px", borderRadius: 12, border: "2px dashed #6366f1", background: "#f5f5ff",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 56, height: 56, borderRadius: "50%", background: "#6366f1",
                    }}>
                      <Camera size={28} color="#fff" />
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{t("Appuyez ici pour prendre la photo")}</span>
                    <span className="muted" style={{ fontSize: 12.5 }}>{t("de votre quittance signée")}</span>
                  </button>
                )}
                {error ? (
                  <p role="status" aria-live="polite" className="muted text-rose" style={{ fontSize: 13, margin: "10px 0 0", display: "flex", gap: 6, alignItems: "center" }}>
                    <AlertTriangle size={14} /> {error}
                  </p>
                ) : null}
                {file ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center", display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}
                    onClick={send}
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="domus-spin" size={18} /> : <Send size={18} />} {t("Envoyer")}
                  </button>
                ) : null}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default TenantReceiptUpload;
