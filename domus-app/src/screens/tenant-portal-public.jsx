// Portail locataire public (accès sans login, token opaque dans l'URL) —
// même principe que TenantOnboardingPublic : la page /domus/mon-espace?token=...
// résout le locataire depuis le backend (GET /tenant-portal) et affiche loyer,
// échéance et historique des paiements, en lecture seule.
// dueChip/daysUntil/buildLeaseCards dupliqués/réutilisés depuis portail.jsx —
// on ne touche pas au portail gestionnaire existant.
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Loader2, Receipt, History, CheckCircle2, AlertTriangle, User, Send, Download, Clock, FileSignature, Pencil, Upload } from "lucide-react";
import { publicApi } from "../api.js";
import { DomusPhoneField } from "../components/PhoneField.jsx";
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

// Date de bail en toutes lettres ("8 juillet 2026"), plus lisible qu'un
// 08/07/2026 pour un locataire. Les bornes d'un bail arrivent en date seule
// ("2026-07-08") : `new Date` les lit alors comme minuit UTC, et un affichage
// local decalerait au jour precedent a l'ouest de Greenwich. On formate donc
// ces valeurs a partir de leurs composantes, sans fuseau.
function shortDate(dateLike) {
  const dateOnly = typeof dateLike === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateLike.trim());
  if (dateOnly) {
    const [y, m, day] = dateLike.trim().split("-");
    const month = MONTHS_FR[Number(m) - 1];
    if (!month) return null;
    return `${Number(day)} ${month} ${y}`;
  }
  const d = parseDate(dateLike);
  return d ? `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}` : null;
}

// Libelle d'un contrat cote locataire : l'id technique (#2) ne lui parle pas,
// on affiche le bien (et l'unite) du bail rattache, avec repli sur la
// reference du bail puis sur l'id si le bail n'est pas resolvable.
function contractTitle(contract, lease) {
  const place = [lease?.propertyName, lease?.unitName].filter(Boolean).join(", ");
  if (place) return `${t("Bail")} — ${place}`;
  if (lease?.reference) return `${t("Bail")} ${lease.reference}`;
  return `${t("Contrat")} #${contract.id}`;
}

// Sous-ligne : reference du bail + periode couverte, selon ce qui est connu.
function contractSubtitle(lease) {
  const parts = [];
  if (lease?.reference) parts.push(`${t("Réf.")} ${lease.reference}`);
  const from = shortDate(lease?.startDate);
  const to = shortDate(lease?.endDate);
  if (from && to) parts.push(`${t("du")} ${from} ${t("au")} ${to}`);
  else if (from) parts.push(`${t("depuis le")} ${from}`);
  return parts.join(" · ");
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

// Champs editables du dossier, dans l'ordre d'affichage. Le telephone est
// traite a part (input international, cf. DomusPhoneField).
const INFO_FIELDS = [
  ["firstName", "Prénom"],
  ["lastName", "Nom"],
  ["email", "Email"],
  ["address", "Adresse"],
];

// Champ simple (memes classes que onboarding-public.jsx — on duplique plutot
// que de coupler deux pages publiques entre elles).
function Field({ label, value, onChange, type = "text", placeholder = "", disabled = false, autoComplete }) {
  return (
    <label className="domus-property-field">
      <span>{label}</span>
      <input type={type} value={value ?? ""} placeholder={placeholder} disabled={disabled}
        autoComplete={autoComplete} maxLength={255}
        onChange={(e) => onChange?.(e.target.value)} />
    </label>
  );
}

// "" et null sont equivalents cote dossier : sans ca le bouton d'envoi
// resterait actif alors que rien n'a change.
function norm(v) {
  return String(v ?? "").trim();
}

// Valeurs du formulaire = dossier actuel, ecrase par la demande en attente
// s'il y en a une (sinon le locataire perdrait sa saisie precedente).
function buildForm(rec) {
  const tn = rec?.tenant || {};
  const pending = (rec?.changeRequests || []).find((r) => r.status === "pending");
  const changes = pending?.changes || {};
  const base = {
    firstName: tn.firstName || "",
    lastName: tn.lastName || "",
    email: tn.email || "",
    phone: tn.phone || "",
    address: tn.address || "",
  };
  for (const k of Object.keys(base)) {
    if (changes[k] != null) base[k] = changes[k];
  }
  return base;
}

function tenantName(tenant) {
  const n = [tenant?.firstName, tenant?.lastName].filter(Boolean).join(" ").trim();
  return n || tenant?.entityName || t("Locataire");
}

export function TenantPortalPublic({ token }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [fatal, setFatal] = useState("");
  // Formulaire de mise a jour : les valeurs saisies ne modifient rien
  // directement, elles partent en demande soumise a validation.
  const [form, setForm] = useState(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  // La carte s'ouvre en LECTURE : le locataire n'entre en saisie que s'il
  // clique explicitement sur « Modifier mes informations ».
  const [editing, setEditing] = useState(false);
  // Erreur du justificatif : separee de formMsg, sinon elle s'affichait dans
  // le formulaire d'informations personnelles, hors contexte.
  const [proofMsg, setProofMsg] = useState("");
  // Envoi de preuve de paiement (fonctionnalite scannee via le QR code du
  // carnet de quittances) : id du paiement en cours d'envoi + id du dernier
  // paiement dont la preuve vient d'etre envoyee avec succes, pour feedback
  // inline sans bloquer le reste de la page.
  const [uploadingProofId, setUploadingProofId] = useState(null);
  const [uploadedProofId, setUploadedProofId] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const proofInputRef = useRef(null);
  const [proofTargetId, setProofTargetId] = useState(null);
  // Bail pre-selectionne via ?lease=<id> dans l'URL (ex: QR code du carnet de
  // quittances genere pour un bail precis) : simple parametre de query, lu une
  // fois au montage, jamais stocke en DB. Si absent ou introuvable parmi les
  // baux actifs du locataire, le selecteur retombe sur le premier bail (plus
  // recent), comportement inchange pour un locataire a bail unique.
  const [selectedLeaseId, setSelectedLeaseId] = useState(() => {
    if (typeof window === "undefined") return null;
    const fromQuery = new URLSearchParams(window.location.search || "").get("lease");
    return fromQuery || null;
  });
  // Paiement cible via ?pay=<id> dans l'URL : QR code imprimé sur CHAQUE
  // quittance du carnet (contrairement au QR de couverture, qui ouvre le
  // dossier complet du locataire). Scanner ce QR doit ouvrir directement le
  // sélecteur de photo pour CE mois précis, sans que le locataire ait à
  // chercher la bonne ligne dans la liste des échéances.
  const [autoProofPaymentId] = useState(() => {
    if (typeof window === "undefined") return null;
    const fromQuery = new URLSearchParams(window.location.search || "").get("pay");
    return fromQuery || null;
  });
  const autoProofTriggered = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setFatal(t("Lien invalide ou manquant.")); setLoading(false); return; }
      try {
        const rec = await publicApi.tenantPortal(token);
        if (!alive) return;
        setData(rec);
        // Pre-remplit le formulaire (dossier + demande en attente eventuelle).
        setForm(buildForm(rec));
      } catch (e) {
        if (alive) setFatal(t("Ce lien n'est plus valide ou a expiré."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // Déclenche automatiquement le sélecteur de fichier pour le paiement visé
  // par ?pay= dès que les données du portail sont chargées (une seule fois).
  // Si le paiement n'appartient pas à ce locataire (ou a déjà une preuve), on
  // ne force rien : le backend revalide de toute façon l'appartenance à
  // l'upload, et pickProofFile reste accessible normalement depuis la liste.
  useEffect(() => {
    if (autoProofTriggered.current || !autoProofPaymentId || !data) return;
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const target = payments.find((p) => String(p.id) === String(autoProofPaymentId));
    if (target && !target.hasProof) {
      autoProofTriggered.current = true;
      setProofTargetId(target.id);
      setUploadError("");
      proofInputRef.current?.click();
    }
  }, [autoProofPaymentId, data]);

  // Soumet une DEMANDE de modification : le dossier n'est pas modifie tant
  // qu'un gestionnaire n'a pas approuve (le lien portail n'ayant pas de mot de
  // passe, une ecriture directe permettrait un detournement du telephone).
  const submitChanges = async (e) => {
    e.preventDefault();
    if (!form || !dirty) return;
    setFormBusy(true);
    setFormMsg(null);
    try {
      // On n'envoie que les champs reellement modifies : la demande cote
      // gestionnaire reste lisible (3 diffs au lieu de 5 lignes identiques).
      await publicApi.submitTenantChangeRequest(token, changed);
      setFormMsg({ type: "ok", text: t("Demande envoyée. Elle sera validée par votre gestionnaire.") });
      const rec = await publicApi.tenantPortal(token);
      setData(rec);
      setForm(buildForm(rec));
      setEditing(false);
    } catch (err) {
      setFormMsg({ type: "error", text: err?.message || t("Envoi impossible.") });
    } finally {
      setFormBusy(false);
    }
  };

  // Ouvre le justificatif dans un nouvel onglet. L'URL n'est jamais dans la
  // page : elle est demandee au backend, qui verifie d'abord que le paiement
  // appartient bien au porteur du token.
  const openProof = async (paymentId) => {
    try {
      const res = await publicApi.tenantPaymentProof(token, paymentId);
      if (res?.url) window.open(res.url, "_blank", "noopener");
    } catch {
      setProofMsg(t("Justificatif indisponible."));
    }
  };

  // Copie du bail. Le scan s'ouvre tel quel (PDF/image) ; la version
  // electronique s'ouvre en page imprimable qui declenche Enregistrer en PDF.
  // Le backend revalide l'appartenance du bail au porteur du token.
  const openContractCopy = (contract) => {
    if (!contract?.copySource) return;
    const url = publicApi.tenantContractCopyUrl(token, contract.id, contract.copySource);
    window.open(url, "_blank", "noopener");
  };

  // Ouvre le selecteur de fichier pour UN paiement donne (photo ou PDF).
  // L'input est unique et partage (ref), reutilise pour chaque ligne de
  // paiement en attente plutot qu'un <input> par ligne.
  const pickProofFile = (paymentId) => {
    setProofTargetId(paymentId);
    setUploadError("");
    proofInputRef.current?.click();
  };

  const onProofFileChosen = async (e) => {
    const file = e.target.files?.[0] || null;
    e.target.value = "";
    if (!file || !proofTargetId) return;
    setUploadingProofId(proofTargetId);
    setUploadError("");
    try {
      await publicApi.uploadTenantPaymentProof(token, proofTargetId, file);
      setUploadedProofId(proofTargetId);
      const rec = await publicApi.tenantPortal(token);
      setData(rec);
    } catch (err) {
      setUploadError(err?.message || t("Envoi de la preuve impossible."));
    } finally {
      setUploadingProofId(null);
      setProofTargetId(null);
    }
  };

  const activeLeases = useMemo(() => {
    const leases = Array.isArray(data?.leases) ? data.leases : [];
    return leases.filter((l) => (l.status || "active") === "active");
  }, [data]);

  // Bail affiche : celui demande par ?lease=, sinon le premier (le plus
  // recent, meme ordre que le backend). Un seul bail actif => comportement
  // identique a avant (pas de selecteur affiche).
  const activeLease = useMemo(() => {
    const leases = activeLeases.length ? activeLeases : (Array.isArray(data?.leases) ? data.leases : []);
    if (!leases.length) return null;
    if (selectedLeaseId) {
      const found = leases.find((l) => String(l.id) === String(selectedLeaseId));
      if (found) return found;
    }
    return leases[0];
  }, [data, activeLeases, selectedLeaseId]);

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

  // Etat de la derniere demande de modification, pour informer le locataire
  // sans qu'il ait a resoumettre.
  const pendingRequest = useMemo(
    () => (data?.changeRequests || []).find((r) => r.status === "pending") || null,
    [data],
  );
  const lastReviewed = useMemo(
    () => (data?.changeRequests || []).find((r) => r.status !== "pending") || null,
    [data],
  );

  // Diff entre la saisie et le dossier actuel : sert a desactiver l'envoi et a
  // n'envoyer que le strict necessaire.
  const changed = useMemo(() => {
    const tn = data?.tenant || {};
    const out = {};
    if (!form) return out;
    for (const k of Object.keys(form)) {
      if (norm(form[k]) !== norm(tn[k])) out[k] = norm(form[k]);
    }
    return out;
  }, [form, data]);
  const dirty = Object.keys(changed).length > 0;

  const dueDate = activeLease?.nextInvoiceDate || activeLease?.endDate || null;
  const due = dueChip(daysUntil(dueDate));

  // Paiements reellement encaisses (status 'paid'). La caution n'apparait pas
  // ici : elle est stockee a part (real_estate_security_deposits) et n'est pas
  // un loyer.
  const history = useMemo(
    () => leasePayments
      .filter((p) => (p.status || "paid") === "paid")
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))
      .slice(0, 12),
    [leasePayments],
  );

  // Echeances generees mais non reglees : celles dont la date est passee sont
  // en retard, les autres sont a venir.
  const pending = useMemo(
    () => leasePayments
      .filter((p) => (p.status || "paid") === "pending")
      .sort((a, b) => new Date(a.paymentDate || 0) - new Date(b.paymentDate || 0)),
    [leasePayments],
  );
  const overdue = useMemo(() => pending.filter((p) => (daysUntil(p.paymentDate) ?? 0) < 0), [pending]);
  const upcoming = useMemo(() => pending.filter((p) => (daysUntil(p.paymentDate) ?? 0) >= 0), [pending]);

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
                <p className="muted" style={{ margin: 0 }}>
                  {t("Aucun bail en cours. Vous pouvez consulter et demander la mise à jour de vos informations ci-dessous.")}
                </p>
              </div>
            </div>
          ) : (
            <>
              {activeLeases.length > 1 && (
                <div className="portail-lease-tabs" role="tablist" aria-label={t("Choisir un bail")} style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 4px" }}>
                  {activeLeases.map((l) => {
                    const label = [l.propertyName || l.propertyAddress, l.unitName].filter(Boolean).join(" · ") || l.reference || `#${l.id}`;
                    const isActive = String(activeLease?.id) === String(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`chip ${isActive ? "chip-iris" : "chip-ink"}`}
                        style={{ border: "none", cursor: "pointer" }}
                        onClick={() => setSelectedLeaseId(l.id)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
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
                  {/* Nom du bailleur : masque si le bien n'a pas de proprietaire
                      renseigne, plutot qu'afficher un libelle vide. */}
                  {activeLease.landlordName ? (
                    <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
                      {t("Propriétaire")} : {activeLease.landlordName}
                    </p>
                  ) : null}
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

              {overdue.length > 0 && (
                <section className="onb-card">
                  <div className="onb-card-head">
                    <span className="onb-card-icon tone-rose"><AlertTriangle size={18} /></span>
                    <div className="onb-card-heading">
                      <h3>{t("Loyers en retard")}</h3>
                      <p>{t("Échéances non réglées à ce jour")}</p>
                    </div>
                  </div>
                  <div className="onb-card-body">
                    {overdue.map((p) => (
                      <div key={p.id} className="portail-hist-row">
                        <AlertTriangle size={14} className="muted" />
                        <span className="flex-1">{monthLabel(p.paymentDate)}</span>
                        <span className="chip chip-rose">
                          {t("en retard de")} {Math.abs(daysUntil(p.paymentDate) ?? 0)} j
                        </span>
                        <strong>{money(p.amount, p.currencySymbol || symbol)}</strong>
                        <ProofUploadButton
                          payment={p}
                          busy={uploadingProofId === p.id}
                          done={uploadedProofId === p.id}
                          onClick={() => pickProofFile(p.id)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {upcoming.length > 0 && (
                <section className="onb-card">
                  <div className="onb-card-head">
                    <span className="onb-card-icon tone-amber"><Clock size={18} /></span>
                    <div className="onb-card-heading">
                      <h3>{t("Paiements à venir")}</h3>
                      <p>{t("Prochaines échéances de votre bail")}</p>
                    </div>
                  </div>
                  <div className="onb-card-body">
                    {upcoming.slice(0, 12).map((p) => (
                      <div key={p.id} className="portail-hist-row">
                        <Clock size={14} className="muted" />
                        <span className="flex-1">{monthLabel(p.paymentDate)}</span>
                        <span className="muted">{dueChip(daysUntil(p.paymentDate)).text}</span>
                        <strong>{money(p.amount, p.currencySymbol || symbol)}</strong>
                        <ProofUploadButton
                          payment={p}
                          busy={uploadingProofId === p.id}
                          done={uploadedProofId === p.id}
                          onClick={() => pickProofFile(p.id)}
                        />
                      </div>
                    ))}
                  </div>
                  {uploadError ? (
                    <p role="status" aria-live="polite" className="muted text-rose" style={{ fontSize: 13, margin: "8px 0 0", padding: "0 16px 12px" }}>
                      {uploadError}
                    </p>
                  ) : null}
                </section>
              )}
              <input
                ref={proofInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                style={{ display: "none" }}
                onChange={onProofFileChosen}
              />

              {(data?.contracts || []).length > 0 && (
                <section className="onb-card">
                  <div className="onb-card-head">
                    <span className="onb-card-icon tone-iris"><FileSignature size={18} /></span>
                    <div className="onb-card-heading">
                      <h3>{t("Mon bail")}</h3>
                      <p>{(data.contracts || []).some((c) => c.copySource)
                        ? t("Téléchargez votre copie")
                        : t("Contrat signé")}</p>
                    </div>
                  </div>
                  <div className="onb-card-body">
                    {(data.contracts || []).map((c) => {
                      // Le bail du contrat : on ne suppose pas que c'est le bail
                      // actif, on relie par leaseId quand c'est possible.
                      const lease = (data.leases || []).find((l) => String(l.id) === String(c.leaseId))
                        || (String(c.leaseId) === String(activeLease?.id) ? activeLease : null);
                      const subtitle = contractSubtitle(lease);
                      return (
                      <div key={c.id} className="portail-hist-row">
                        <FileSignature size={14} className="muted" />
                        <span className="flex-1">
                          {contractTitle(c, lease)}
                          {subtitle ? <small className="portail-hist-sub muted">{subtitle}</small> : null}
                        </span>
                        <span className="chip chip-emerald">
                          <CheckCircle2 size={12} /> {c.signedAt ? `${t("Signé")} ${monthLabel(c.signedAt)}` : t("Signé")}
                        </span>
                        {/* Un seul bouton : le scan du bail papier si le gestionnaire
                            l'a numérisé, sinon la version signée électroniquement. */}
                        {c.copySource ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => openContractCopy(c)}
                            title={c.copySource === "scan"
                              ? t("Télécharger la copie du bail (scan)")
                              : t("Télécharger la copie du bail")}
                          >
                            <Download size={14} />
                          </button>
                        ) : null}
                      </div>
                      );
                    })}
                  </div>
                </section>
              )}

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
                      {p.hasProof ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => openProof(p.id)}
                          title={t("Télécharger le justificatif")}
                        >
                          <Download size={14} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {proofMsg ? (
                    <p role="status" aria-live="polite" className="muted text-rose" style={{ fontSize: 13, margin: "8px 0 0" }}>
                      {proofMsg}
                    </p>
                  ) : null}
                </div>
              </section>
            </>
          )}

          {/* Toujours affichee, y compris sans bail en cours : c'est le seul
              service disponible pour un locataire sans bail actif. */}
          <section className="onb-card">
            <div className="onb-card-head">
              <span className="onb-card-icon tone-iris"><User size={18} /></span>
              <div className="onb-card-heading">
                <h3>{t("Mes informations")}</h3>
                <p>{t("Demandez une mise à jour de vos données")}</p>
              </div>
            </div>
            <div className="onb-card-body">
              {pendingRequest ? (
                <p className="chip chip-amber" style={{ marginBottom: 12 }}>
                  <Clock size={12} /> {t("Demande en attente de validation")}
                </p>
              ) : null}
              {/* Une demande en attente remplace l'etat de la precedente :
                  afficher les deux chips donnerait deux messages contradictoires. */}
              {!pendingRequest && lastReviewed ? (
                <p className={`chip ${lastReviewed.status === "approved" ? "chip-emerald" : "chip-rose"}`} style={{ marginBottom: 12 }}>
                  {lastReviewed.status === "approved"
                    ? <><CheckCircle2 size={12} /> {t("Dernière demande acceptée")}</>
                    : <><AlertTriangle size={12} /> {t("Dernière demande refusée")}{lastReviewed.reviewNote ? ` — ${lastReviewed.reviewNote}` : ""}</>}
                </p>
              ) : null}

              {editing ? (
                <form onSubmit={submitChanges}>
                  <div className="domus-property-form-grid">
                    {INFO_FIELDS.slice(0, 2).map(([key, label]) => (
                      <Field key={key} label={t(label)} value={form?.[key]} disabled={formBusy}
                        autoComplete={key === "firstName" ? "given-name" : "family-name"}
                        onChange={(v) => setForm((f) => ({ ...(f || {}), [key]: v }))} />
                    ))}
                    <DomusPhoneField label={t("Téléphone")} value={form?.phone}
                      onChange={(v) => setForm((f) => ({ ...(f || {}), phone: v }))} />
                    <Field label={t("Email")} type="email" value={form?.email} disabled={formBusy}
                      autoComplete="email" placeholder={t("Non renseigné")}
                      onChange={(v) => setForm((f) => ({ ...(f || {}), email: v }))} />
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <Field label={t("Adresse")} value={form?.address} disabled={formBusy}
                      autoComplete="street-address" placeholder={t("Non renseigné")}
                      onChange={(v) => setForm((f) => ({ ...(f || {}), address: v }))} />
                  </div>
                  <div className="onb-inline-actions">
                    <button type="button" className="btn" disabled={formBusy}
                      onClick={() => { setForm(buildForm(data)); setFormMsg(null); setEditing(false); }}>
                      {t("Annuler")}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={formBusy || !dirty}>
                      <Send size={16} /> {formBusy ? t("Envoi…") : t("Envoyer la demande")}
                    </button>
                  </div>
                  <p className="muted" style={{ fontSize: 12, margin: "12px 0 0" }}>
                    {t("Vos modifications sont vérifiées par votre gestionnaire avant d'être appliquées.")}
                  </p>
                </form>
              ) : (
                <>
                  {[...INFO_FIELDS.slice(0, 2), ["phone", "Téléphone"], ...INFO_FIELDS.slice(2)].map(([key, label]) => {
                    const current = data?.tenant?.[key];
                    const asked = pendingRequest?.changes?.[key];
                    const hasAsked = asked != null && norm(asked) !== norm(current);
                    return (
                      <div key={key} className="portail-hist-row">
                        <span className="flex-1 muted">{t(label)}</span>
                        <div style={{ textAlign: "right" }}>
                          <strong>{norm(current) || "—"}</strong>
                          {hasAsked ? (
                            <div className="muted" style={{ fontSize: 12 }}>
                              {t("demandé")} : {norm(asked) || "—"}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-primary" style={{ marginTop: 16 }}
                    onClick={() => { setForm(buildForm(data)); setFormMsg(null); setEditing(true); }}>
                    <Pencil size={16} /> {pendingRequest ? t("Modifier ma demande") : t("Modifier mes informations")}
                  </button>
                </>
              )}

              {formMsg ? (
                <p role="status" aria-live="polite"
                  className={`muted ${formMsg.type === "error" ? "text-rose" : "text-emerald"}`}
                  style={{ fontSize: 13, margin: "12px 0 0" }}>
                  {formMsg.text}
                </p>
              ) : null}
            </div>
          </section>

          <p className="onb-secure">{t("Lien personnel — ne le partagez pas.")}</p>
        </div>
      </div>
    </div>
  );
}

// Bouton d'envoi de preuve pour UNE echeance en attente. Trois etats : envoi
// disponible, en cours (spinner), ou deja envoyee pour ce paiement dans cette
// session (p.hasProof reflete aussi l'etat persiste apres rechargement). Une
// preuve deja presente desactive le bouton : le backend refuse de toute facon
// d'ecraser un justificatif existant (voir submitPaymentProof cote serveur).
function ProofUploadButton({ payment, busy, done, onClick }) {
  if (payment.hasProof || done) {
    return (
      <span className="chip chip-emerald" title={t("Preuve envoyee")}>
        <CheckCircle2 size={12} /> {t("Envoyée")}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs"
      disabled={busy}
      onClick={onClick}
      title={t("Envoyer une preuve de paiement (photo ou PDF)")}
    >
      {busy ? <Loader2 size={14} className="domus-spin" /> : <Upload size={14} />}
    </button>
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
