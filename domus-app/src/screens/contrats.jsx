// SCRUM-247 — Contrats & signature (liste, détail, envoi, modèles).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarX, Check, Clock, Copy, Eye, FileCheck2, FilePen, FilePlus, Files, History,
  Printer, Search, Send, ShieldCheck, X, FileCheck,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import {
  AUDIT_EVENT_LABEL, CONTRACT_STATUS, TEMPLATE_TYPE_LABEL, contractRef, escapeHtml,
  formatAuditWhen, formatSignedAt, hasHtmlMarkup, openContractPrint, signingUrlFromContract,
} from "../contractUtils.js";
import { parseDomusDate, useDateRange } from "../dateRange.jsx";
import { money, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { sanitizeHtml } from "../sanitizeHtml.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Metric, MetricsGrid } from "./ui.jsx";
import { Autocomplete } from "../components/Autocomplete.jsx";

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
  const [templateModal, setTemplateModal] = useState(null);

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
      window.alert("Envoyez d'abord le contrat pour obtenir un lien de signature.");
      return;
    }
    navigator.clipboard.writeText(link).then(
      () => {},
      () => window.prompt("Copiez le lien de signature :", link),
    );
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = window.confirm(
      "Retirer ce contrat des vues actives ? (suppression logique — l'historique est conservé.)",
    );
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

  const openTemplateEditor = async (t) => {
    setActionError("");
    try {
      const full = await api.contractTemplate(t.id);
      setTemplateModal({ id: full.id, name: full.name || "", type: full.type || "residential", description: full.description || "", body: full.body || "", isActive: Boolean(full.isActive) });
    } catch {
      setTemplateModal({ id: t.id, name: t.name || "", type: t.type || "residential", description: t.description || "", body: t.body || "", isActive: Boolean(t.isActive) });
    }
  };
  const handleActivateTemplate = async (t) => {
    setBusy(`tpl-activate-${t.id}`);
    setActionError("");
    try {
      await api.activateContractTemplate(t.id);
      await reload();
    } catch (e) {
      setActionError(e.message || "Impossible d'activer le modèle.");
    } finally {
      setBusy("");
    }
  };
  const handleDeleteTemplate = async (t) => {
    if (!window.confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    setBusy(`tpl-del-${t.id}`);
    setActionError("");
    try {
      await api.deleteContractTemplate(t.id);
      await reload();
    } catch (e) {
      setActionError(e.message || "Impossible de supprimer le modèle.");
    } finally {
      setBusy("");
    }
  };
  const handleSaveTemplate = async (form) => {
    setBusy("tpl-save");
    setActionError("");
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        body: form.body,
        description: form.description?.trim() || undefined,
        isActive: Boolean(form.isActive),
      };
      if (form.id) await api.updateContractTemplate(form.id, payload);
      else await api.createContractTemplate(payload);
      setTemplateModal(null);
      await reload();
    } catch (e) {
      setActionError(e.message || "Impossible d'enregistrer le modèle.");
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
                  <button type="button" className="btn" disabled={!detail} onClick={() => detail && openContractPrint(detail)}>
                    <Printer size={14} /> Imprimer
                  </button>
                  <button type="button" className="btn" disabled={!detail} onClick={() => detail && openContractPrint(detail)}>
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
                </div>
              </div>
              </div>
              </div>
            </div>
          )}
        </div>

        <aside className="card contrats-templates">
          <div className="contrats-templates-head">
            <span className="eyebrow" style={{ margin: 0 }}><Files size={14} /> Modèles de contrat</span>
            <button type="button" className="immo-link" onClick={() => setTemplateModal({ name: "", type: "residential", description: "", body: "", isActive: false })}>
              <FilePlus size={14} /> Nouveau
            </button>
          </div>
          <div className="contrats-template-list">
            {templates.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>Aucun modèle configuré.</p>
            )}
            {templates.map((t) => (
              <div key={t.id} className={`contrats-template-card ${t.isActive ? "" : "inactive"}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                  <span className={`chip ${t.isActive ? "chip-emerald" : "chip-ink"}`} style={{ marginLeft: "auto" }}>
                    {t.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  {TEMPLATE_TYPE_LABEL[t.type] || t.type} · v{t.version || 1}
                  {t.updatedAt ? ` · MAJ ${new Date(t.updatedAt).toLocaleDateString("fr-FR")}` : ""}
                </div>
                <div className="contrats-template-actions">
                  <button type="button" disabled={Boolean(busy)} onClick={() => openTemplateEditor(t)}><FilePen size={12} /> Modifier</button>
                  {!t.isActive && <button type="button" disabled={Boolean(busy)} onClick={() => handleActivateTemplate(t)}><Check size={12} /> Activer</button>}
                  <button type="button" className="danger" disabled={Boolean(busy) || t.isActive} title={t.isActive ? "Impossible de supprimer le modèle actif" : "Supprimer"} onClick={() => handleDeleteTemplate(t)}><X size={12} /> Suppr.</button>
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 12, marginBottom: 0 }}>
            Placeholders disponibles : [NOM COMPLET DU BAILLEUR], [NOM COMPLET DU PRENEUR], [ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION], [MONTANT DU LOYER AVEC DEVISE], etc.
          </p>
        </aside>
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

      {templateModal && (
        <TemplateModal
          value={templateModal}
          busy={busy === "tpl-save"}
          onClose={() => setTemplateModal(null)}
          onSave={handleSaveTemplate}
        />
      )}

      {actionError && <div className="domus-floating-error">{actionError}</div>}
    </>
  );
}

const TEMPLATE_TYPE_OPTIONS = [
  ["residential", "Bail résidentiel"],
  ["commercial", "Bail commercial"],
  ["short_term", "Bail court terme / saisonnier"],
];

const CONTRACT_PLACEHOLDER_GROUPS = [
  {
    label: "Bailleur",
    items: [
      "NOM COMPLET DU BAILLEUR",
      "ADRESSE DU BAILLEUR",
      "TÉLÉPHONE DU BAILLEUR",
      "EMAIL DU BAILLEUR",
    ],
  },
  {
    label: "Preneur",
    items: [
      "NOM COMPLET DU PRENEUR",
      "ADRESSE DU PRENEUR",
      "TÉLÉPHONE DU PRENEUR",
      "EMAIL DU PRENEUR",
      "NUMÉRO DE PIÈCE D'IDENTITÉ",
    ],
  },
  {
    label: "Logement",
    items: [
      "ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION",
      "TYPE DE LOGEMENT",
      "PROPRIÉTÉ",
      "UNITÉ",
      "RÉFÉRENCE BAIL",
      "VILLE",
    ],
  },
  {
    label: "Dates",
    items: [
      "NUMÉRO DE MOIS",
      "DURÉE DE BAIL EN MOIS",
      "DATE DE DÉBUT DE BAIL",
      "DATE DE DÉBUT DE BAIL JJ/MM/AAAA",
      "DATE DE FIN DE BAIL",
      "DATE DE FIN DE BAIL JJ/MM/AAAA",
      "DATE DE SIGNATURE DE BAIL",
      "DATE DE SIGNATURE DE BAIL JJ/MM/AAAA",
      "DATE DU JOUR",
    ],
  },
  {
    label: "Montants",
    items: [
      "MONTANT DU LOYER AVEC DEVISE",
      "MONTANT DU LOYER",
      "MONTANT GARANTIE AVEC DEVISE",
      "MONTANT GARANTIE",
      "NUMÉRO DE MOIS DE GARANTIE",
      "DEVISE",
      "SYMBOLE DE DEVISE",
      "CODE DE DEVISE",
    ],
  },
];

function TemplateModal({ value, busy, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));
  const canSave = form.name.trim() && form.body.trim() && form.type;
  const insertPlaceholder = (name) => {
    const token = `[${name}]`;
    const textarea = textareaRef.current;
    setShowPreview(false);
    setForm((current) => {
      const body = current.body || "";
      const start = textarea ? textarea.selectionStart : body.length;
      const end = textarea ? textarea.selectionEnd : body.length;
      const insert = textarea ? token : `${body ? "\n" : ""}${token}`;
      const nextBody = `${body.slice(0, start)}${insert}${body.slice(end)}`;
      const nextCaret = start + insert.length;
      requestAnimationFrame(() => {
        const nextTextarea = textareaRef.current;
        if (!nextTextarea) return;
        nextTextarea.focus();
        nextTextarea.setSelectionRange(nextCaret, nextCaret);
      });
      return { ...current, body: nextBody };
    });
  };
  const previewHtml = hasHtmlMarkup(form.body)
    ? form.body
    : `<pre class="domus-contract-plain">${escapeHtml(form.body || "")}</pre>`;
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={() => !busy && onClose()} />
      <div className="modal-card domus-template-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><FilePen size={20} /></span>
            <div>
              <h2>{form.id ? "Modifier le modèle" : "Nouveau modèle"}</h2>
              <p>Contenu du contrat avec placeholders (ex. [MONTANT DU LOYER AVEC DEVISE])</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")}><X size={18} /></button>
        </div>
        <div className="domus-template-form">
          <div className="domus-property-form-grid">
            <label className="domus-property-field">
              <span>Nom <b>*</b></span>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="ex. Bail résidentiel standard" />
            </label>
            <label className="domus-property-field">
              <span>Type <b>*</b></span>
              <select value={form.type} onChange={(e) => set({ type: e.target.value })}>
                {TEMPLATE_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className="domus-property-field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Optionnel" />
          </label>
          <div className="domus-template-body-head">
            <span>Contenu du contrat <b>*</b> <em>(HTML accepté)</em></span>
            <button type="button" className="immo-link" onClick={() => setShowPreview((v) => !v)}>
              <Eye size={14} /> {showPreview ? "Éditer" : "Aperçu"}
            </button>
          </div>
          <div className="domus-placeholder-panel" aria-label="Placeholders disponibles">
            {CONTRACT_PLACEHOLDER_GROUPS.map((group) => (
              <div className="domus-placeholder-group" key={group.label}>
                <div className="domus-placeholder-label">{group.label}</div>
                <div className="domus-placeholder-list">
                  {group.items.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => insertPlaceholder(item)}
                      title={`Insérer [${item}]`}
                    >
                      [{item}]
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {showPreview ? (
            <div className="domus-template-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }} />
          ) : (
            <textarea
              ref={textareaRef}
              className="domus-template-body"
              value={form.body}
              onChange={(e) => set({ body: e.target.value })}
              placeholder={"CONTRAT DE BAIL\nARTICLE 1 : ...\n[NOM COMPLET DU PRENEUR], [ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION], [MONTANT DU LOYER AVEC DEVISE]...\n\nHTML possible : <h2>Titre</h2> <b>gras</b> <ul><li>...</li></ul>"}
            />
          )}
          <label className="domus-template-active">
            <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => set({ isActive: e.target.checked })} />
            <span>Définir comme modèle actif pour ce type</span>
          </label>
        </div>
        <div className="domus-modal-footer">
          <button type="button" className="domus-modal-cancel" onClick={onClose} disabled={busy}>Annuler</button>
          <button type="button" className="domus-modal-submit" onClick={() => onSave(form)} disabled={busy || !canSave}>
            <Check size={14} /> {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
