// Portail locataire public (accès sans login, token opaque dans l'URL) —
// même principe que TenantOnboardingPublic : la page /domus/mon-espace?token=...
// résout le locataire depuis le backend (GET /tenant-portal) et affiche loyer,
// échéance et historique des paiements, en lecture seule.
// dueChip/daysUntil/buildLeaseCards dupliqués/réutilisés depuis portail.jsx —
// on ne touche pas au portail gestionnaire existant.
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Receipt, History, CheckCircle2, AlertTriangle } from "lucide-react";
import { publicApi } from "../api.js";
import { money } from "../data.js";
import { buildLeaseCards } from "./loyers.jsx";
import { t } from "../i18n.js";

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function parseDate(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthLabel(dateLike) {
  const d = parseDate(dateLike);
  if (!d) return "—";
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(dateLike) {
  const d = parseDate(dateLike);
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function dueChip(days) {
  if (days == null) return { text: t("Échéance à confirmer"), chip: "chip-ink" };
  if (days < 0) return { text: `${t("en retard de")} ${Math.abs(days)} j`, chip: "chip-rose" };
  if (days === 0) return { text: t("dû aujourd'hui"), chip: "chip-amber" };
  return { text: `${t("dû dans")} ${days} j`, chip: "chip-amber" };
}

function tenantName(tenant) {
  const n = [tenant?.firstName, tenant?.lastName].filter(Boolean).join(" ").trim();
  return n || tenant?.entityName || t("Locataire");
}

export function TenantPortalPublic({ token }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [fatal, setFatal] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setFatal(t("Lien invalide ou manquant.")); setLoading(false); return; }
      try {
        const rec = await publicApi.tenantPortal(token);
        if (!alive) return;
        setData(rec);
      } catch (e) {
        if (alive) setFatal(t("Ce lien n'est plus valide ou a expiré."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const activeLease = useMemo(() => {
    const leases = Array.isArray(data?.leases) ? data.leases : [];
    return leases.find((l) => (l.status || "active") === "active") || leases[0] || null;
  }, [data]);

  const leasePayments = useMemo(() => {
    if (!activeLease) return [];
    const payments = Array.isArray(data?.payments) ? data.payments : [];
    return payments.filter((p) => String(p.leaseId) === String(activeLease.id));
  }, [data, activeLease]);

  const card = useMemo(() => {
    if (!activeLease) return null;
    const cards = buildLeaseCards([activeLease], Array.isArray(data?.payments) ? data.payments : []);
    return cards[0] || null;
  }, [activeLease, data]);

  const dueDate = activeLease?.nextInvoiceDate || activeLease?.endDate || null;
  const due = dueChip(daysUntil(dueDate));

  const history = useMemo(
    () => [...leasePayments].sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0)).slice(0, 12),
    [leasePayments],
  );

  if (loading) {
    return (
      <div className="onb-page">
        <div className="onb-state">
          <Loader2 className="domus-spin" size={36} />
          <p className="muted">{t("Chargement de votre espace…")}</p>
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

  const tenant = data?.tenant;
  const unit = activeLease
    ? [activeLease.propertyName || activeLease.propertyAddress, activeLease.unitName].filter(Boolean).join(" · ")
    : t("Aucun bail actif");
  const symbol = card?.symbol || activeLease?.currencySymbol || "CDF";

  return (
    <div className="onb-page">
      <div className="onb-shell">
        <header className="onb-hero">
          <PortalMark dark />
          <h1>{t("Espace locataire")}</h1>
          <p>{tenantName(tenant)} · {unit}</p>
        </header>

        <div className="onb-body">
          {!activeLease ? (
            <div className="onb-card">
              <div className="onb-card-body">
                <p className="muted" style={{ margin: 0 }}>{t("Aucun bail actif trouvé pour ce lien.")}</p>
              </div>
            </div>
          ) : (
            <>
              <section className="onb-card">
                <div className="onb-card-head">
                  <span className="onb-card-icon tone-iris"><Building2 size={18} /></span>
                  <div className="onb-card-heading">
                    <h3>{t("Prochain loyer")}</h3>
                    <p>{unit}</p>
                  </div>
                  <span className={`chip ${due.chip}`} style={{ marginLeft: "auto" }}>{due.text}</span>
                </div>
                <div className="onb-card-body">
                  <div style={{ fontSize: 28, fontWeight: 600 }}>{money(activeLease.rentAmount, symbol)}</div>
                  <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
                    {dueDate
                      ? `${t("Échéance")} ${parseDate(dueDate)?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                      : t("Date d'échéance non renseignée")}
                    {card?.status === "ok" && <span> · <CheckCircle2 size={12} style={{ verticalAlign: -1 }} /> {t("À jour")}</span>}
                    {card?.status === "pending" && <span> · {t("Mois en cours à régler")}</span>}
                    {card?.status === "late" && <span style={{ color: "#be123c" }}> · <AlertTriangle size={12} style={{ verticalAlign: -1 }} /> {t("Retard")}</span>}
                  </p>
                </div>
              </section>

              <section className="onb-card">
                <div className="onb-card-head">
                  <span className="onb-card-icon tone-emerald"><History size={18} /></span>
                  <div className="onb-card-heading">
                    <h3>{t("Historique des paiements")}</h3>
                    <p>{t("Vos derniers paiements enregistrés")}</p>
                  </div>
                </div>
                <div className="onb-card-body">
                  {history.length === 0 && (
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>{t("Aucun paiement enregistré.")}</p>
                  )}
                  {history.map((p) => (
                    <div key={p.id} className="portail-hist-row">
                      <Receipt size={14} className="muted" />
                      <span className="flex-1">{monthLabel(p.paymentDate)}</span>
                      <span className="muted">{p.method || "—"}</span>
                      <strong>{money(p.amount, p.currencySymbol || symbol)}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <p className="onb-secure">{t("Lien personnel — ne le partagez pas.")}</p>
        </div>
      </div>
    </div>
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

export default TenantPortalPublic;
