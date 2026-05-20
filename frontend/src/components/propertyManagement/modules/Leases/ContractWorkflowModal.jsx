import axios from "axios";
import {
  Briefcase,
  CalendarClock,
  Check,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { message } from "antd";

import { createContract, loadContracts, sendContract } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { compactMoney } from "../../shared/format";
import { tenantNameFromLease } from "../../shared/tenants";
import { leaseDisplayInfo, pickDefaultTemplateFor } from "./leaseUtils";

const templateIconFor = (type) => {
  if (type === "commercial") return <Briefcase size={18} />;
  if (type === "short_term") return <CalendarClock size={18} />;
  return <FileText size={18} />;
};

const ContractWorkflowModal = ({ contract, contractLinks, contractTemplates, lease, onClose, onContractLink, tenants, units }) => {
  const dispatch = useDispatch();
  const [contractTemplate, setContractTemplate] = useState(() => pickDefaultTemplateFor(lease, contractTemplates, units));
  const [contractClauses, setContractClauses] = useState({
    inventory: true,
    guarantor: true,
    pets: false,
    rentReview: false,
  });
  const [customClauses, setCustomClauses] = useState([]);
  const [busy, setBusy] = useState(false);

  if (!lease) return null;

  const info = leaseDisplayInfo(lease, contract);
  const tenant = tenants.find((item) => item.id === lease.tenantId || item.id === lease.tenant?.id);
  const tenantEmail = lease.tenantEmail || lease.tenant?.email || contract?.tenantEmail || tenant?.email || "Email non renseigné";
  const tenantPhone = lease.tenantPhone || lease.tenant?.phone || tenant?.phone || "Téléphone non renseigné";
  const rent = Number(lease.rentAmount || lease.monthlyRent || 0);
  const deposit = Number(lease.securityDeposit || rent * 2 || 0);
  const durationLabel = `${info.years} ans · ${info.start ? info.start.format("DD/MM/YYYY") : "-"} → ${info.end ? info.end.format("DD/MM/YYYY") : "-"}`;
  const safeTemplates = (contractTemplates || []).filter(Boolean);
  const templates = safeTemplates.length
    ? safeTemplates.map((tpl) => ({
        key: tpl.id,
        label: tpl.name,
        description: tpl.description || (tpl.isActive ? "Modèle actif" : "Modèle disponible"),
        icon: templateIconFor(tpl.type),
      }))
    : [
        {
          key: "standard",
          label: "Aucun modèle configuré",
          description: "Le contrat sera généré avec le modèle par défaut.",
          icon: <FileText size={18} />,
        },
      ];
  const clauses = [
    { key: "inventory", label: "État des lieux annexé", description: "Inventaire de la propriété joint au contrat" },
    { key: "guarantor", label: "Caution solidaire", description: "Garant + pièce d'identité requis" },
    { key: "pets", label: "Animaux autorisés", description: "Mention dans l'article 9" },
    { key: "rentReview", label: "Révision annuelle du loyer", description: "Indexation sur indice BCC" },
  ];

  const buildLeaseContractContent = () => {
    const customClauseTexts = customClauses
      .filter((clause) => clause.enabled && (clause.title.trim() || clause.description.trim()))
      .map((clause) => {
        const title = clause.title.trim();
        const description = clause.description.trim();
        if (title && description) return `${title}: ${description}`;
        return title || description;
      });
    const selectedClauses = [
      contractClauses.inventory && "État des lieux annexé au contrat.",
      contractClauses.guarantor && "Caution solidaire avec garant et pièce d'identité.",
      contractClauses.pets && "Animaux autorisés selon les conditions du bail.",
      contractClauses.rentReview && "Révision annuelle du loyer selon l'indice BCC.",
      ...customClauseTexts,
    ].filter(Boolean);

    return [
      "CONTRAT DE BAIL",
      "",
      `Référence bail: ${lease.reference || `BAIL-${lease.id}`}`,
      `Locataire: ${tenantNameFromLease(lease)}`,
      `Propriété: ${info.propertyLabel}`,
      `Période: ${info.start ? info.start.format("DD/MM/YYYY") : "-"} au ${info.end ? info.end.format("DD/MM/YYYY") : "-"}`,
      `Loyer mensuel: ${compactMoney(rent)}`,
      `Caution: ${compactMoney(deposit)}`,
      "",
      "Clauses additionnelles:",
      selectedClauses.length ? selectedClauses.map((clause) => `- ${clause}`).join("\n") : "- Aucune clause additionnelle sélectionnée.",
    ].join("\n");
  };

  const addCustomClause = () => {
    setCustomClauses((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        enabled: true,
        title: "",
        description: "",
      },
    ]);
  };

  const updateCustomClause = (id, updates) => {
    setCustomClauses((prev) =>
      prev.map((clause) => (clause.id === id ? { ...clause, ...updates } : clause)),
    );
  };

  const removeCustomClause = (id) => {
    setCustomClauses((prev) => prev.filter((clause) => clause.id !== id));
  };

  const ensureContract = async () => {
    if (contract?.id) return contract;
    const numericTemplateId = Number.isFinite(Number(contractTemplate)) && Number(contractTemplate) > 0
      ? Number(contractTemplate)
      : null;
    const response = await dispatch(createContract({
      leaseId: lease.id,
      ...(numericTemplateId ? { templateId: numericTemplateId } : { contractContent: buildLeaseContractContent() }),
    }));
    if (response.payload?.message === "success") {
      await dispatch(loadContracts());
      return response.payload.data;
    }
    return null;
  };

  const getContractLink = (currentContract) =>
    contractLinks[currentContract?.id] ||
    currentContract?.signingUrl ||
    currentContract?.signatureUrl ||
    currentContract?.signatureLink ||
    currentContract?.publicUrl ||
    currentContract?.url ||
    "";

  const ensureSigningLink = async (currentContract) => {
    const existing = getContractLink(currentContract);
    if (existing) return existing;
    const response = await dispatch(sendContract(currentContract.id));
    const link = response.payload?.data?.signingUrl || "";
    if (link) {
      onContractLink(currentContract.id, link);
      await dispatch(loadContracts());
    }
    return link;
  };

  const openPreview = async () => {
    const currentContract = await ensureContract();
    if (!currentContract?.id) {
      message.error("Impossible de générer le contrat.");
      return;
    }
    try {
      const { data } = await axios.get(`property-management/contracts/${currentContract.id}`);
      const win = window.open("", "_blank", "width=920,height=1100");
      if (!win) {
        message.error("Autorisez les popups pour ouvrir l'aperçu PDF.");
        return;
      }
      win.document.open();
      win.document.write(`<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;margin:32px">${data?.contractContent || buildLeaseContractContent()}</pre>`);
      win.document.close();
      win.focus();
    } catch {
      message.error("Impossible d'ouvrir l'aperçu du contrat.");
    }
  };

  const generateAndSend = async () => {
    setBusy(true);
    const currentContract = await ensureContract();
    const link = currentContract?.id ? await ensureSigningLink(currentContract) : "";
    setBusy(false);
    if (link) {
      message.success("Contrat généré et envoyé pour signature");
      onClose();
    } else {
      message.warning("Contrat généré, mais aucun lien de signature n'a été retourné.");
    }
  };

  return (
    <div className="immo-contract-modal" role="dialog" aria-modal="true" aria-labelledby="lease-contract-title">
      <button type="button" className="immo-contract-backdrop" onClick={onClose} aria-label="Fermer" />
      <section className="immo-contract-dialog">
        <header className="immo-contract-header">
          <div className="immo-contract-title">
            <span><FileText size={22} /></span>
            <div>
              <h2 id="lease-contract-title">Générer le contrat de bail</h2>
              <p>{info.reference}</p>
            </div>
          </div>
          <button type="button" className="immo-contract-close" onClick={onClose} aria-label="Fermer">
            <X size={22} />
          </button>
        </header>

        <div className="immo-contract-steps" aria-label="Progression contrat">
          {["Aperçu", "Envoi", "Signature"].map((step, index) => (
            <div key={step} className={index === 0 ? "active" : ""}>
              <span>{index + 1}</span>
              {step}
            </div>
          ))}
        </div>

        <div className="immo-contract-body">
          <section>
            <h3>Informations du bail</h3>
            <div className="immo-contract-summary">
              <div><span>Locataire</span><strong>{tenantNameFromLease(lease)}</strong></div>
              <div><span>Propriété</span><strong>{info.propertyLabel}</strong></div>
              <div><span>Durée</span><strong>{durationLabel}</strong></div>
              <div><span>Loyer mensuel</span><strong>{compactMoney(rent)}</strong></div>
              <div><span>Caution (2 mois)</span><strong>{compactMoney(deposit)}</strong></div>
            </div>
          </section>

          <section>
            <h3>Modèle de contrat</h3>
            <div className="immo-contract-template-grid">
              {templates.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  className={contractTemplate === template.key ? "active" : ""}
                  onClick={() => setContractTemplate(template.key)}
                >
                  <span>{template.icon}</span>
                  <div>
                    <strong>{template.label}</strong>
                    <small>{template.description}</small>
                  </div>
                  {contractTemplate === template.key && <Check size={16} />}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Clauses additionnelles</h3>
            <div className="immo-contract-clauses">
              {clauses.map((clause) => (
                <label key={clause.key} className="immo-contract-clause">
                  <input
                    type="checkbox"
                    checked={Boolean(contractClauses[clause.key])}
                    onChange={(event) =>
                      setContractClauses((prev) => ({ ...prev, [clause.key]: event.target.checked }))
                    }
                  />
                  <span>
                    <strong>{clause.label}</strong>
                    <small>{clause.description}</small>
                  </span>
                </label>
              ))}
              {customClauses.map((clause, index) => (
                <div key={clause.id} className="immo-custom-clause">
                  <div className="immo-custom-clause-row">
                    <input
                      type="checkbox"
                      checked={clause.enabled}
                      onChange={(event) => updateCustomClause(clause.id, { enabled: event.target.checked })}
                      aria-label="Activer la clause personnalisée"
                    />
                    <div className="immo-custom-clause-fields">
                      <input
                        type="text"
                        value={clause.title}
                        autoFocus={index === customClauses.length - 1 && !clause.title}
                        placeholder="Titre de la clause (ex. Interdiction de sous-location)"
                        onChange={(event) => updateCustomClause(clause.id, { title: event.target.value })}
                      />
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={clause.description}
                        placeholder="Décrivez la clause en détail. Elle sera ajoutée au contrat."
                        onChange={(event) => updateCustomClause(clause.id, { description: event.target.value })}
                      />
                      <div className="immo-custom-clause-meta">
                        <span><Sparkles size={12} /> Clause personnalisée</span>
                        <small>{clause.description.length} / 500</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="immo-custom-clause-remove"
                      onClick={() => removeCustomClause(clause.id)}
                      aria-label="Supprimer cette clause"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="immo-add-clause" onClick={addCustomClause}>
                <Plus size={16} /> Ajouter une clause personnalisée
              </button>
            </div>
          </section>

          <section>
            <h3>Envoi au locataire pour signature</h3>
            <div className="immo-send-grid">
              <label className="active">
                <input type="radio" name="contract-send-method" defaultChecked />
                <Mail size={17} />
                <strong>Email</strong>
                <span>{tenantEmail}</span>
              </label>
              <label>
                <input type="radio" name="contract-send-method" />
                <MessageSquare size={17} />
                <strong>SMS / WhatsApp</strong>
                <span>{tenantPhone}</span>
              </label>
            </div>
          </section>

          <div className="immo-contract-secure">
            <ShieldCheck size={18} />
            <p>
              <strong>Signature électronique sécurisée.</strong> Le locataire recevra un lien unique pour consulter et signer.
            </p>
          </div>
        </div>

        <footer className="immo-contract-footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <div>
            <button type="button" className="secondary" onClick={openPreview} disabled={busy}>
              <Eye size={17} /> Aperçu PDF
            </button>
            <button type="button" className="primary" onClick={generateAndSend} disabled={busy}>
              <Send size={17} /> {busy ? "Génération..." : "Générer & envoyer"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default ContractWorkflowModal;
