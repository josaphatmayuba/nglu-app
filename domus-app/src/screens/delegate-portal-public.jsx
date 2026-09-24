// Portail delegue public (acces sans login, token opaque dans l'URL) —
// /domus/delegue?token=... : le mandataire charge du suivi de loyer repond a
// une relance recue par SMS. Une seule question : le locataire a-t-il paye ?
//
// Sur « Oui », il saisit le montant et peut joindre une photo de preuve. Ce
// que cela cree cote serveur est un paiement EN ATTENTE, jamais un
// encaissement : le gestionnaire valide ensuite depuis le CRM, et c'est cette
// validation qui passe l'ecriture comptable. La page le dit explicitement au
// delegue, pour qu'il ne croie pas avoir solde le dossier.
//
// Pendant de owner-portal-public.jsx, mais avec une action : c'est le seul
// portail public de Domus qui ecrit.
import { useEffect, useRef, useState } from "react";
import { Check, X, Loader2, Camera, Receipt, Wallet, Building2 } from "lucide-react";
import { publicApi } from "../api.js";
import { t } from "../i18n.js";

function fmtMonth(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function Card({ icon, tone = "tone-iris", title, subtitle, children }) {
  return (
    <section className="onb-card">
      <div className="onb-card-head">
        <span className={`onb-card-icon ${tone}`}>{icon}</span>
        <div className="onb-card-heading">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="onb-card-body">{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="portail-hist-row">
      <span className="flex-1 muted">{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

export function DelegatePortalPublic({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // null = pas encore choisi · "paid" · "unpaid"
  const [answer, setAnswer] = useState(null);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [proof, setProof] = useState(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    publicApi
      .delegateRentCheck(token)
      .then((d) => {
        if (!alive) return;
        setData(d);
        // Lien deja utilise : on affiche le recapitulatif au lieu du formulaire,
        // pour qu'un second clic sur le meme SMS ne cree pas de doublon.
        if (d?.answer) setDone({ answer: d.answer, alreadyAnswered: true });
        // Le montant du loyer pre-rempli evite au delegue de le ressaisir sur
        // un telephone quand le locataire a paye le montant exact.
        if (d?.lease?.rentAmount != null) setAmount(String(d.lease.rentAmount));
      })
      .catch((e) => alive && setError(e.message || String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  async function submit() {
    setBusy(true);
    setSubmitError("");
    try {
      const res = await publicApi.submitDelegateRentCheck(token, {
        answer,
        amount: answer === "paid" ? amount : undefined,
        comment,
        proof: answer === "paid" ? proof : null,
      });
      setDone(res);
    } catch (e) {
      setSubmitError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="onb-public">
        <div className="onb-loading">
          <Loader2 className="spin" size={28} />
          <p>{t("Chargement...")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onb-public">
        <div className="onb-card">
          <div className="onb-card-body">
            <h3>{t("Lien invalide ou expire")}</h3>
            <p className="muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const lease = data?.lease || {};
  const currency = lease.currencySymbol || lease.currencyCode || "";
  const rentLabel = lease.rentAmount != null ? `${lease.rentAmount} ${currency}`.trim() : "—";

  if (done) {
    const paid = done.answer === "paid";
    return (
      <div className="onb-public">
        <Card
          icon={paid ? <Check size={20} /> : <Receipt size={20} />}
          tone={paid ? "tone-emerald" : "tone-amber"}
          title={paid ? t("Merci, c'est enregistre") : t("Merci, c'est note")}
          subtitle={done.alreadyAnswered ? t("Vous aviez deja repondu a cette relance.") : undefined}
        >
          {paid ? (
            <p>
              {t("Le paiement est transmis au gestionnaire pour validation. Il apparaitra comme encaisse une fois qu'il l'aura confirme.")}
            </p>
          ) : (
            <p>{t("Le gestionnaire est informe que le loyer n'est pas encore paye.")}</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="onb-public">
      <Card
        icon={<Building2 size={20} />}
        title={t("Suivi de loyer")}
        subtitle={data?.delegateName ? `${t("Bonjour")} ${data.delegateName}` : undefined}
      >
        <Row label={t("Locataire")} value={lease.tenantName} />
        <Row label={t("Logement")} value={lease.address} />
        <Row label={t("Loyer")} value={rentLabel} />
        <Row label={t("Periode")} value={fmtMonth(data?.periodMonth)} />
      </Card>

      <Card icon={<Wallet size={20} />} tone="tone-amber" title={t("Le locataire a-t-il paye ?")}>
        <div style={{ display: "flex", gap: 10, marginBottom: answer ? 16 : 0 }}>
          <button
            type="button"
            className={`immo-btn ${answer === "paid" ? "primary" : ""}`}
            style={{ flex: 1 }}
            onClick={() => setAnswer("paid")}
          >
            <Check size={16} /> {t("Oui, il a paye")}
          </button>
          <button
            type="button"
            className={`immo-btn ${answer === "unpaid" ? "primary" : ""}`}
            style={{ flex: 1 }}
            onClick={() => setAnswer("unpaid")}
          >
            <X size={16} /> {t("Non, pas encore")}
          </button>
        </div>

        {answer === "paid" && (
          <>
            <label className="domus-property-field">
              <span>{t("Montant paye")}{currency ? ` (${currency})` : ""}<b> *</b></span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label className="domus-property-field">
              <span>{t("Photo de preuve (recu, capture mobile money)")}</span>
              {/* Pas de `capture` : le telephone propose ainsi Appareil photo OU
                  Galerie, le delegue pouvant avoir recu le recu par message. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setProof(e.target.files?.[0] || null)}
              />
              {proof ? (
                <span className="muted" style={{ fontSize: 13 }}>
                  <Camera size={13} /> {proof.name}
                </span>
              ) : null}
            </label>
          </>
        )}

        {answer && (
          <label className="domus-property-field">
            <span>{answer === "paid" ? t("Commentaire (optionnel)") : t("Que dit le locataire ?")}</span>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={answer === "paid" ? t("ex. paye en especes le 12") : t("ex. promet de payer vendredi")}
            />
          </label>
        )}

        {submitError && <div className="api-error">{submitError}</div>}

        {answer && (
          <>
            {answer === "paid" && (
              <p className="muted" style={{ fontSize: 13 }}>
                {t("Le gestionnaire validera ce paiement avant qu'il soit comptabilise.")}
              </p>
            )}
            <button
              type="button"
              className="immo-btn primary"
              style={{ width: "100%", marginTop: 10 }}
              disabled={busy || (answer === "paid" && !Number(amount))}
              onClick={submit}
            >
              {busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />}{" "}
              {busy ? t("Envoi...") : t("Envoyer ma reponse")}
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
