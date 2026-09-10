// SCRUM-247 — Contrats & signature (liste, détail, envoi, modèles).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarX, Check, Clock, Copy, FileCheck2, FilePen, FilePlus, History,
  Printer, Search, Send, ShieldCheck, X, FileCheck,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { downloadSignedContractPdf } from "../contractPdf.js";
import {
  AUDIT_EVENT_LABEL, CONTRACT_STATUS, TEMPLATE_TYPE_LABEL, contractRef,
  formatAuditWhen, formatSignedAt, hasHtmlMarkup, openContractPrint, signingUrlFromContract,
} from "../contractUtils.js";
import { parseDomusDate, useDateRange } from "../dateRange.jsx";
import { money, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { sanitizeHtml } from "../sanitizeHtml.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Metric, MetricsGrid } from "./ui.jsx";
import { Autocomplete } from "../components/Autocomplete.jsx";
import { useConfirm, usePrompt, useToast } from "../components/Dialog.jsx";

async function loadContractsModule() {
  const [contracts, leases, templates] = await Promise.all([
    api.contracts(),
    api.leases(),
    api.contractTemplates().catch(() => []),
  ]);
  return { contracts, leases, templates };
}

function leaseLabel(l) {
  const tenant = [l.tenantFirstName, l.tenantLastName].filter(Boolean).join(" ") || l.tenantName;
  const unit = [l.propertyName, l.unitName].filter(Boolean).join(" · ");
  return `#${l.id} — ${tenant || l.reference || "Bail"}${unit ? ` · ${unit}` : ""}`;
}

function templateLabel(t) {
  return t?.name || TEMPLATE_TYPE_LABEL[t?.type] || "Modèle";
}

function contractInDateRange(c, range) {
  if (!range?.active) return true;
  const dates = [c.createdAt, c.sentAt, c.signedAt].filter(Boolean);
  if (!dates.length) return range.inRange(c.createdAt);
  return dates.some((d) => range.inRange(d));
}

function daysUntilEnd(lease) {
  const end = parseDomusDate(lease?.endDate);
  if (!end) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

export function Contrats() {
  const { data, loading, error, reload } = useApi(loadContractsModule, []);
  useRealtimeReload(reload, ["contracts", "leases"]);
  const dateRange = useDateRange();
  const confirm = useConfirm();
  const promptDialog = usePrompt();
  const toast = useToast();

  const contracts = useMemo(
    () => (Array.isArray(data?.contracts) ? data.contracts : []).filter((c) => contractInDateRange(c, dateRange)),
    [data?.contracts, dateRange],
  );
  const leases = useMemo(() => (Array.isArray(data?.leases) ? data.leases : []), [data]);
  const templates = useMemo(() => (Array.isArray(data?.templates) ? data.templates : []), [data]);

  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLeaseId, setCreateLeaseId] = useState("");
  const [createTemplateId, setCreateTemplateId] = useState("");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [signingLinks, setSigningLinks] = useState({});

  const leasesById = useMemo(() => {
    const map = new Map();
    leases.forEach((l) => map.set(String(l.id), l));
    return map;
  }, [leases]);

  const contractsByLease = useMemo(() => {
    const map = new Map();
    contracts.forEach((c) => {
      if (c?.leaseId != null && !map.has(String(c.leaseId))) map.set(String(c.leaseId), c);
    });
    return map;
  }, [contracts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...contracts]
      .sort((a, b) => Number(b.id) - Number(a.id))
      .filter((c) => {
        if (!q) return true;
        const ref = contractRef(c).toLowerCase();
        return [ref, c.tenantName, c.tenantEmail, c.status].some((v) => String(v || "").toLowerCase().includes(q));
      });
  }, [contracts, query]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    if (!filtered.some((c) => String(c.id) === String(selectedId))) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const full = await api.contract(id);
      setDetail(full);
    } catch (e) {
      setActionError(e.message || "Impossible de charger le contrat.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const metrics = useMemo(() => {
    const signed = contracts.filter((c) => c.status === "signed").length;
    const pending = contracts.filter((c) => ["sent", "viewed"].includes(c.status)).length;
    const draft = contracts.filter((c) => c.status === "draft").length;
    const expiring = leases.filter((l) => {
      const d = daysUntilEnd(l);
      return d != null && d >= 0 && d <= 30 && (l.status || "active") === "active";
    }).length;
    return { signed, pending, draft, expiring };
  }, [contracts, leases]);

  const selectedSummary = filtered.find((c) => String(c.id) === String(selectedId)) || null;
  const selectedLease = selectedSummary?.leaseId ? leasesById.get(String(selectedSummary.leaseId)) : null;
  const statusMeta = CONTRACT_STATUS[detail?.status || selectedSummary?.status] || CONTRACT_STATUS.draft;

  const createLeaseOptions = useMemo(
    () => leases
      .filter((l) => (l.status || "active") === "active")
      .map((l) => ({ id: String(l.id), label: leaseLabel(l), hasContract: contractsByLease.has(String(l.id)) })),
    [leases, contractsByLease],
  );

  const handleCreate = async () => {
    if (!createLeaseId) return;
    setBusy("create");
    setActionError("");
    try {
      const body = { leaseId: Number(createLeaseId) };
      if (createTemplateId) body.templateId = Number(createTemplateId);
      const created = await api.createContract(body);
      setCreateOpen(false);
      setCreateLeaseId("");
      setCreateTemplateId("");
      await reload();
      if (created?.id) setSelectedId(created.id);
    } catch (e) {
      setActionError(e.message || "Impossible de créer le contrat.");
    } finally {
      setBusy("");
    }
  };

  const handleSend = async (id = selectedId) => {
    if (!id) return;
    setBusy(`send-${id}`);
    setActionError("");
    try {
      const res = await api.sendContract(id);
      if (res?.signingUrl) {
        setSigningLinks((prev) => ({ ...prev, [id]: res.signingUrl }));
      }
      await reload();
      await loadDetail(id);
    } catch (e) {
      setActionError(e.message || "Impossible d'envoyer le contrat.");
    } finally {
      setBusy("");
    }
  };

  const copySigningLink = () => {
    const link = signingUrlFromContract(detail || selectedSummary, signingLinks);
    if (!link) {
      toast.error(t("Envoyez d'abord le contrat pour obtenir un lien de signature."));
      return;
    }
    navigator.clipboard.writeText(link).then(
      () => toast.success(t("Lien de signature copié.")),
      () => promptDialog({ title: t("Lien de signature"), label: t("Copiez le lien :"), defaultValue: link, readOnly: true, copyable: true }),
    );
  };

  // Renvoi manuel du message de bienvenue (contrat signé mais message jamais parti).
  const handleSendWelcome = async () => {
    if (!selectedId) return;
    setBusy("welcome");
    setActionError("");
    try {
      await api.sendContractWelcome(selectedId);
      await reload();
      await loadDetail(selectedId);
    } catch (e) {
      setActionError(e.message || "Impossible d'envoyer le message de bienvenue.");
    } finally {
      setBusy("");
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = await confirm({
      title: t("Retirer le contrat"),
      message: t("Retirer ce contrat des vues actives ? (suppression logique — l'historique est conservé.)"),
      confirmLabel: t("Retirer"),
      danger: true,
    });
    if (!ok) return;
    setBusy("delete");
    setActionError("");
    try {
      await api.deleteContract(selectedId);
      await reload();
      setSelectedId(null);
      setDetail(null);
    } catch (e) {
      setActionError(e.message || "Impossible de retirer le contrat.");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const signingLink = signingUrlFromContract(detail || selectedSummary, signingLinks);
  const canSend = detail && !["signed", "expired", "deleted"].includes(detail.status);

  return (
    <>
      <div className="immo-header">
        <div>
          <div className="eyebrow">Documents légaux</div>
          <h1>Contrats &amp; signature</h1>
          <p>Génération, envoi et suivi des signatures électroniques</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Contrat, locataire..." />
          </label>
          <button type="button" className="immo-btn primary" onClick={() => setCreateOpen(true)}>
            <FilePlus size={16} /> Générer depuis un bail
          </button>
        </div>
      </div>

      <MetricsGrid>
        <Metric tone="green" icon={<FileCheck2 size={20} />} label={t("Signés")} value={metrics.signed} />
        <Metric tone="amber" icon={<Clock size={20} />} label={t("En attente de signature")} value={metrics.pending} />
        <Metric tone="brand" icon={<FilePen size={20} />} label={t("Brouillons")} value={metrics.draft} />
        <Metric tone="red" icon={<CalendarX size={20} />} label={t("Baux expirent < 30 j")} value={metrics.expiring} />
      </MetricsGrid>

      <div className="contrats-layout">
        <div className="contrats-main">
          <div className="card contrats-table-wrap">
            <table className="tbl contrats-table">
              <thead>
                <tr>
                  <th>Contrat</th>
                  <th>Locataire</th>
                  <th>Modèle</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted" style={{ padding: 20 }}>Aucun contrat sur cette période.</td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const meta = CONTRACT_STATUS[c.status] || CONTRACT_STATUS.draft;
                  const active = String(c.id) === String(selectedId);
                  return (
                    <tr
                      key={c.id}
                      className={active ? "contrats-row-active" : ""}
                      onClick={() => { setSelectedId(c.id); setDetailOpen(true); }}
                    >
                      <td style={{ fontWeight: 600 }}>{contractRef(c)}</td>
                      <td className="muted">{c.tenantName || "—"}</td>
                      <td className="muted">
                        {TEMPLATE_TYPE_LABEL[leasesById.get(String(c.leaseId))?.unitType]
                          || templateLabel(templates.find((t) => t.isActive))
                          || "—"}
                      </td>
                      <td><span className={`chip ${meta.chip}`}>{meta.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {detailOpen && selectedSummary && (
            <div className="modal-layer">
              <div className="modal-scrim" onClick={() => setDetailOpen(false)} />
              <div className="modal-card contrats-detail-modal">
              <div className="card contrats-detail">
              <div className="contrats-detail-head">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{contractRef(selectedSummary)}</span>
                  <span className={`chip ${statusMeta.chip}`}>{statusMeta.label}</span>
                  {detailLoading && <span className="muted" style={{ fontSize: 12 }}>Chargement…</span>}
                </div>
                <div className="contrats-detail-actions">
                  <button type="button" className="btn" onClick={() => setDetailOpen(false)} title="Fermer"><X size={14} /></button>
                  <button type="button" className="btn" disabled={!detail} onClick={() => detail && openContractPrint(detail, { onError: toast.error })}>
                    <Printer size={14} /> Imprimer
                  </button>
                  <button type="button" className="btn" disabled={!detail} onClick={() => detail && downloadSignedContractPdf(detail)}>
                    <FileCheck size={14} /> PDF
                  </button>
                  {signingLink && (
                    <button type="button" className="btn" onClick={copySigningLink}>
                      <Copy size={14} /> Lien
                    </button>
                  )}
                  {canSend && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={Boolean(busy)}
                      onClick={() => handleSend()}
                    >
                      <Send size={14} /> {detail?.status === "sent" || detail?.status === "viewed" ? "Renvoyer" : "Envoyer"}
                    </button>
                  )}
                  {detail?.status === "signed" && !detail?.welcomeMessageSentAt && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={Boolean(busy)}
                      onClick={handleSendWelcome}
                      title="Envoyer le message de bienvenue (email + SMS) au locataire"
                    >
                      <Send size={14} /> Message de bienvenue
                    </button>
                  )}
                  {detail?.status === "draft" && (
                    <button type="button" className="btn" style={{ color: "#be123c" }} disabled={Boolean(busy)} onClick={handleDelete}>
                      Retirer
                    </button>
                  )}
                </div>
              </div>

              <div className="contrats-detail-grid">
                <div className="contrats-paper">
                  <div className="contrats-paper-head">
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>CONTRAT DE BAIL</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {selectedLease
                        ? `${TEMPLATE_TYPE_LABEL.residential} · ${selectedLease.unitName || "logement"}`
                        : "Document locatif"}
                    </div>
                  </div>
                  {selectedLease && (
                    <div className="contrats-paper-meta">
                      <p><span className="muted">Locataire :</span> {selectedSummary.tenantName || "—"}</p>
                      <p><span className="muted">Logement :</span> {[selectedLease.propertyName, selectedLease.unitName].filter(Boolean).join(" · ") || "—"}</p>
                      <p><span className="muted">Loyer :</span> {money(selectedLease.rentAmount, selectedLease.currencySymbol || "$")}/mois</p>
                      <p>
                        <span className="muted">Durée :</span>{" "}
                        {selectedLease.startDate ? new Date(selectedLease.startDate).toLocaleDateString("fr-FR") : "—"}
                        {" — "}
                        {selectedLease.endDate ? new Date(selectedLease.endDate).toLocaleDateString("fr-FR") : "—"}
                      </p>
                    </div>
                  )}
                  <div className="contrats-paper-body">
                    {detail && hasHtmlMarkup(detail.contractContent) ? (
                      <div className="contrats-paper-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(detail.contractContent) }} />
                    ) : (
                      <pre className="contrats-paper-plain">{detail?.contractContent || "Sélectionnez un contrat pour afficher le contenu."}</pre>
                    )}
                  </div>
                  <div className="contrats-paper-sigs">
                    <div>
                      <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>Bailleur</div>
                      {detail?.companyInfo?.landlordSignature || detail?.landlordSignature ? (
                        <img
                          src={detail.companyInfo?.landlordSignature || detail.landlordSignature}
                          alt="Signature bailleur"
                          className="contrats-sig-img"
                        />
                      ) : (
                        <div className="contrats-sig-landlord">{detail?.landlordName || detail?.companyInfo?.companyName || "Domus"}</div>
                      )}
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>Locataire</div>
                      {detail?.signatureData ? (
                        <img src={detail.signatureData} alt="Signature" className="contrats-sig-img" />
                      ) : (
                        <div className="contrats-sig-pending">en attente…</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="contrats-audit">
                  <p className="contrats-audit-title"><History size={14} /> Journal d&apos;audit</p>
                  <div className="contrats-timeline">
                    {(detail?.auditLogs || []).length === 0 && (
                      <p className="muted" style={{ fontSize: 12 }}>Aucun événement enregistré.</p>
                    )}
                    {(detail?.auditLogs || []).map((log) => (
                      <div key={log.id} className="contrats-timeline-item">
                        <span className={`contrats-timeline-dot ${log.event === "signed" ? "done" : ""}`} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{AUDIT_EVENT_LABEL[log.event] || log.event}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{log.details || "—"}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{formatAuditWhen(log.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="contrats-legal-note">
                    <ShieldCheck size={16} />
                    Signature électronique horodatée et liée à un lien sécurisé unique — valeur probante.
                  </div>
                  {detail?.signedAt && (
                    <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                      Signé le {formatSignedAt(detail.signedAt)}
                    </p>
                  )}
                  {detail?.status === "signed" && (
                    <p style={{ fontSize: 12, marginTop: 4, color: detail?.welcomeMessageSentAt ? "#059669" : "#b45309" }}>
                      {detail?.welcomeMessageSentAt
                        ? `Message de bienvenue envoyé le ${formatSignedAt(detail.welcomeMessageSentAt)}`
                        : "Message de bienvenue non envoyé — utilisez le bouton « Message de bienvenue »."}
                    </p>
                  )}
                </div>
              </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <div className="modal-layer">
          <div className="modal-scrim" onClick={() => !busy && setCreateOpen(false)} />
          <div className="modal-card domus-action-modal" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <div className="domus-modal-title">
                <span className="domus-modal-title-icon"><FilePlus size={20} /></span>
                <div>
                  <h2>Générer un contrat</h2>
                  <p>Depuis un bail actif</p>
                </div>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label={t("Fermer")}><X size={18} /></button>
            </div>
            <div style={{ padding: "0 24px 20px" }}>
              <label className="domus-property-field">
                <span>Bail associé <b>*</b></span>
                <Autocomplete value={createLeaseId} onChange={setCreateLeaseId} placeholder="Choisir un bail"
                  options={createLeaseOptions.map((o) => ({ value: o.id, label: `${o.label}${o.hasContract ? " (contrat existant)" : ""}` }))} />
              </label>
              <label className="domus-property-field" style={{ marginTop: 14 }}>
                <span>Modèle (optionnel)</span>
                <Autocomplete value={createTemplateId} onChange={setCreateTemplateId} placeholder="Modèle actif par défaut"
                  options={templates.map((t) => ({ value: t.id, label: `${t.name}${t.isActive ? " · actif" : ""}` }))} />
              </label>
              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                Le contenu est généré automatiquement à partir du bail et du modèle.
              </p>
            </div>
            <div className="domus-modal-footer">
              <button type="button" className="domus-modal-cancel" onClick={() => setCreateOpen(false)} disabled={Boolean(busy)}>Annuler</button>
              <button type="button" className="domus-modal-submit" onClick={handleCreate} disabled={Boolean(busy) || !createLeaseId}>
                <Check size={14} /> Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {actionError && <div className="domus-floating-error">{actionError}</div>}
    </>
  );
}
