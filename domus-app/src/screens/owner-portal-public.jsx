// Portail proprietaire public (acces sans login, token opaque dans l'URL) —
// pendant de tenant-portal-public.jsx cote bailleur : la page
// /domus/proprietaire?token=... resout le couple (proprietaire, locataire)
// depuis le backend (GET /owner-portal) et affiche la fiche complete du
// locataire annonce par SMS, plus ses baux situes sur les biens de CE
// proprietaire. Strictement en lecture seule : aucune action d'ecriture.
import { useEffect, useState } from "react";
import { Building2, Loader2, User, FileSignature, Wallet, Receipt, Download } from "lucide-react";
import { publicApi } from "../api.js";
import { money } from "../data.js";
import { t } from "../i18n.js";

function fmtDate(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Une ligne "libelle / valeur" ; masquee quand la valeur est vide. */
function Row({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="portail-hist-row">
      <span className="flex-1 muted">{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
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

function PortalMark({ dark = false }) {
  return (
    <div className={`onb-brand ${dark ? "on-dark" : ""}`}>
      <div className="onb-brand-logo"><Building2 size={22} color="#fff" /></div>
      <span className="font-display onb-brand-name">Domus</span>
    </div>
  );
}

export function OwnerPortalPublic({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    publicApi.ownerPortal(token)
      .then((res) => { if (alive) { setData(res); setFatal(null); } })
      .catch((e) => { if (alive) setFatal(e.message || String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  // Ouvre le justificatif dans un nouvel onglet. L'URL n'est jamais dans la
  // page : elle est demandee au backend, qui verifie d'abord que le paiement
  // appartient bien a un bien du porteur du token.
  const openProof = (paymentId) => {
    window.open(publicApi.ownerPaymentProofUrl(token, paymentId), "_blank", "noopener");
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
          <PortalMark dark />
          <h1 style={{ marginTop: 18 }}>{t("Lien indisponible")}</h1>
          <p className="muted">{fatal}</p>
        </div>
      </div>
    );
  }

  const tenant = data?.tenant || {};
  const leases = data?.leases || [];
  const tenantName = [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") || t("Locataire");

  return (
    <div className="onb-page">
      <div className="onb-shell">
        <header className="onb-hero">
          <PortalMark dark />
          <h1>{t("Dossier locataire")}</h1>
          <p>{tenantName}{data?.owner?.name ? ` · ${data.owner.name}` : ""}</p>
        </header>

        <div className="onb-body">
          <Card icon={<User size={18} />} title={t("Identite")} subtitle={t("Informations personnelles du locataire")}>
            <Row label={t("Nom complet")} value={tenantName} />
            <Row label={t("Téléphone")} value={tenant.phone} />
            <Row label={t("Téléphone 2")} value={tenant.phone2} />
            <Row label={t("Email")} value={tenant.email} />
            <Row label={t("Adresse")} value={tenant.address} />
            <Row label={t("Date de naissance")} value={tenant.birthDate ? fmtDate(tenant.birthDate) : ""} />
            <Row label={t("Sexe")} value={tenant.sex} />
            <Row label={t("Nationalité")} value={tenant.nationality} />
            <Row label={t("État civil")} value={tenant.maritalStatus} />
            <Row label={t("Province d'origine")} value={tenant.originProvince} />
            <Row label={t("Pièce d'identité")} value={[tenant.idDocumentType, tenant.idNumber].filter(Boolean).join(" · ")} />
            <Row label={t("Nombre d'occupants")} value={tenant.occupantNumber} />
            <Row label={t("Nombre d'enfants")} value={tenant.childNumber} />
            <Row label={t("Conjoint")} value={[tenant.partenairName, tenant.partenairNumber].filter(Boolean).join(" · ")} />
          </Card>

          <Card icon={<Wallet size={18} />} tone="tone-amber" title={t("Situation professionnelle")} subtitle={t("Capacité de paiement déclarée")}>
            <Row label={t("Statut")} value={tenant.professionalStatus} />
            <Row label={t("Activité principale")} value={tenant.mainActivity} />
            <Row label={t("Employeur")} value={tenant.entityName} />
            <Row label={t("Adresse employeur")} value={tenant.entityAddress} />
            <Row label={t("Type de contrat")} value={tenant.contractType} />
            <Row label={t("Revenu mensuel")} value={tenant.monthlyPay} />
            <Row label={t("Autres revenus")} value={tenant.otherMonthlyIncome} />
          </Card>

          <Card icon={<Building2 size={18} />} tone="tone-rose" title={t("Historique logement")} subtitle={t("Situation précédente déclarée")}>
            <Row label={t("Ancienne adresse")} value={tenant.oldAddress} />
            <Row label={t("Ancien bailleur")} value={tenant.oldLessor} />
            <Row label={t("Motif du déménagement")} value={tenant.movingReason} />
            <Row label={t("Personne de contact")} value={[tenant.contactedPerson, tenant.contactedPersonPhoneNumber].filter(Boolean).join(" · ")} />
          </Card>

          {leases.length === 0 ? (
            <div className="onb-card">
              <div className="onb-card-body">
                <p className="muted" style={{ margin: 0 }}>
                  {t("Aucun bail sur vos biens pour ce locataire. Le dossier est ouvert, le bail viendra ensuite.")}
                </p>
              </div>
            </div>
          ) : (
            leases.map((lease) => {
              const place = [lease.propertyName, lease.unitName, lease.propertyAddress, lease.propertyCity]
                .filter(Boolean)
                .join(", ");
              const symbol = lease.currencySymbol || "";
              const charges = lease.taxName && lease.taxValue != null
                ? `${lease.taxName} · ${lease.taxType === "percent" ? `${Number(lease.taxValue)} %` : money(lease.taxValue, symbol)}`
                : "";
              return (
                <Card
                  key={lease.id}
                  icon={<FileSignature size={18} />}
                  title={`${t("Bail")} ${lease.reference || lease.id}`}
                  subtitle={place}
                >
                  <Row label={t("Logement")} value={place} />
                  <Row label={t("Appartement")} value={lease.unitName} />
                  <Row label={t("Début")} value={fmtDate(lease.startDate)} />
                  <Row label={t("Fin")} value={lease.endDate ? fmtDate(lease.endDate) : t("Non renseignée")} />
                  <Row label={t("Loyer")} value={money(lease.rentAmount, symbol)} />
                  <Row label={t("Périodicité")} value={lease.billingCycle} />
                  <Row label={t("Caution contractuelle")} value={money(lease.securityDeposit, symbol)} />
                  <Row label={t("Charges")} value={charges} />
                  <Row label={t("Statut")} value={lease.status} />

                  {(lease.depositsPaid || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p className="muted" style={{ fontSize: 12, margin: "0 0 6px" }}>
                        {t("Cautions effectivement encaissées")}
                      </p>
                      {lease.depositsPaid.map((d, i) => (
                        <div key={i} className="portail-hist-row">
                          <Receipt size={14} className="muted" />
                          <span className="flex-1">{fmtDate(d.paymentDate)}</span>
                          <span className="muted">{d.status === "returned" ? t("restituée") : t("détenue")}</span>
                          <strong>{money(d.amount, d.currencySymbol || symbol)}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {(lease.payments || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p className="muted" style={{ fontSize: 12, margin: "0 0 6px" }}>
                        {t("Paiements")}
                      </p>
                      {lease.payments.map((p) => (
                        <div key={p.id} className="portail-hist-row">
                          <Receipt size={14} className="muted" />
                          <span className="flex-1">{fmtDate(p.paymentDate)}</span>
                          <span className="muted">{p.status === "paid" ? t("payé") : t("en attente")}</span>
                          <strong>{money(p.amount, p.currencySymbol || symbol)}</strong>
                          {p.hasProof ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => openProof(p.id)}
                              title={t("Voir la quittance")}
                            >
                              <Download size={14} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}

          <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: "8px 0 0" }}>
            {t("Ce lien vous est personnel et donne accès à ce seul dossier, en lecture seule.")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default OwnerPortalPublic;
