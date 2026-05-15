import { Button, Form, Input, Modal, Select, Tag, message, Popconfirm } from "antd";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  deleteContractTemplate,
  duplicateContractTemplate,
  loadContractTemplates,
  saveContractTemplate,
  setActiveContractTemplate,
} from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import "./PropertyManagement.css";

const TYPE_OPTIONS = [
  { label: "Résidentiel", value: "residential" },
  { label: "Commercial / bureau", value: "commercial" },
  { label: "Court terme", value: "short_term" },
];

const TYPE_LABELS = TYPE_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {});

// Variables disponibles, regroupées par sujet, pour aider le gestionnaire
const VARIABLE_GROUPS = [
  {
    title: "Bailleur",
    items: [
      "NOM COMPLET DU BAILLEUR",
      "ADRESSE DU BAILLEUR",
      "TÉLÉPHONE DU BAILLEUR",
      "EMAIL DU BAILLEUR",
    ],
  },
  {
    title: "Preneur (locataire)",
    items: [
      "NOM COMPLET DU PRENEUR",
      "ADRESSE DU PRENEUR",
      "TÉLÉPHONE DU PRENEUR",
      "EMAIL DU PRENEUR",
      "NUMÉRO DE PIÈCE D'IDENTITÉ",
    ],
  },
  {
    title: "Bien loué",
    items: [
      "ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION",
      "TYPE DE LOGEMENT",
      "PROPRIÉTÉ",
      "UNITÉ",
    ],
  },
  {
    title: "Bail",
    items: [
      "RÉFÉRENCE BAIL",
      "DATE DE DÉBUT DE BAIL",
      "DATE DE FIN DE BAIL",
      "NUMÉRO DE MOIS",
      "MONTANT DU LOYER",
      "MONTANT GARANTIE",
      "NUMÉRO DE MOIS DE GARANTIE",
    ],
  },
  {
    title: "Signature",
    items: [
      "VILLE",
      "DATE DE SIGNATURE DE BAIL",
      "DATE DU JOUR",
    ],
  },
];

const SAMPLE_VARIABLES = {
  "NOM COMPLET DU BAILLEUR": "SARL Immobilière du Fleuve",
  "ADRESSE DU BAILLEUR": "12, Av. Tombalbaye — Gombe, Kinshasa",
  "TÉLÉPHONE DU BAILLEUR": "+243 999 000 111",
  "EMAIL DU BAILLEUR": "contact@immo-fleuve.cd",
  "NOM COMPLET DU PRENEUR": "Marie Kabongo",
  "ADRESSE DU PRENEUR": "Av. Bandundu, n° 42 — Lemba, Kinshasa",
  "TÉLÉPHONE DU PRENEUR": "+243 815 678 901",
  "EMAIL DU PRENEUR": "marie.kabongo@email.cd",
  "NUMÉRO DE PIÈCE D'IDENTITÉ": "OR-RDC-2021-12345",
  "ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION": "15, Av. Tombalbaye, Gombe",
  "TYPE DE LOGEMENT": "Habitation - appartement",
  "PROPRIÉTÉ": "Résidence Tombalbaye",
  "UNITÉ": "A-203",
  "RÉFÉRENCE BAIL": "BAIL-2026-018",
  "DATE DE DÉBUT DE BAIL": "01/06/2026",
  "DATE DE FIN DE BAIL": "31/05/2029",
  "NUMÉRO DE MOIS": "36",
  "MONTANT DU LOYER": "850,00",
  "MONTANT GARANTIE": "1 700,00",
  "NUMÉRO DE MOIS DE GARANTIE": "2",
  "VILLE": "Kinshasa",
  "DATE DE SIGNATURE DE BAIL": "15/05/2026",
  "DATE DU JOUR": "15/05/2026",
};

const applySample = (body) =>
  body.replace(/\[\s*([^\[\]]+?)\s*\]/g, (match, raw) => {
    const key = raw.toUpperCase().trim();
    return SAMPLE_VARIABLES[key] || match;
  });

const emptyTemplate = (type = "residential") => ({
  id: null,
  name: "",
  type,
  description: "",
  body: "",
  isActive: false,
  version: 1,
});

export default function ContractTemplatesPage() {
  const dispatch = useDispatch();
  const { contractTemplates, templatesLoading } = useSelector((state) => state.propertyManagement);
  const [editing, setEditing] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    dispatch(loadContractTemplates());
  }, [dispatch]);

  const grouped = useMemo(() => {
    const map = { residential: [], commercial: [], short_term: [] };
    (contractTemplates || []).forEach((tpl) => {
      if (tpl?.type && map[tpl.type]) map[tpl.type].push(tpl);
    });
    return map;
  }, [contractTemplates]);

  const handleSave = async () => {
    if (!editing?.name?.trim() || !editing?.body?.trim()) {
      message.warning("Renseigne au moins le nom et le contenu du modèle.");
      return;
    }
    const payload = {
      name: editing.name.trim(),
      type: editing.type,
      body: editing.body,
      description: editing.description || undefined,
      isActive: editing.isActive,
    };
    const result = await dispatch(saveContractTemplate({ id: editing.id, values: payload }));
    if (result.payload?.message === "success") {
      setEditing(null);
    }
  };

  const handleSetActive = (id) => dispatch(setActiveContractTemplate(id));
  const handleDuplicate = (id) => dispatch(duplicateContractTemplate(id));
  const handleDelete = (id) => dispatch(deleteContractTemplate(id));

  return (
    <UserPrivateComponent permission="readAll-propertyManagement">
      <div className="immo-page tpl-page">
        <div className="immo-header">
          <div>
            <Link to="/admin/property-management" className="tpl-back">
              <ArrowLeft size={14} /> Retour à l'immobilier
            </Link>
            <h1>Modèles de contrat de bail</h1>
            <p>
              Rédige les modèles utilisés à la génération des contrats. Les modifications n'affectent
              <strong> que les nouveaux contrats</strong> ; les anciens restent figés.
            </p>
          </div>
          <div className="immo-header-actions">
            <button
              type="button"
              className="immo-primary-button"
              onClick={() => setEditing(emptyTemplate())}
            >
              <FilePlus2 size={16} /> Nouveau modèle
            </button>
          </div>
        </div>

        {TYPE_OPTIONS.map((type) => (
          <section className="tpl-group" key={type.value}>
            <header className="tpl-group-head">
              <div>
                <h2>{type.label}</h2>
                <span>{grouped[type.value].length} modèle{grouped[type.value].length > 1 ? "s" : ""}</span>
              </div>
            </header>
            {grouped[type.value].length ? (
              <div className="tpl-grid">
                {grouped[type.value].map((tpl) => (
                  <article key={tpl.id} className={`tpl-card ${tpl.isActive ? "active" : ""}`}>
                    <div className="tpl-card-head">
                      <div>
                        <h3>{tpl.name}</h3>
                        <p>{tpl.description || "Aucune description"}</p>
                      </div>
                      {tpl.isActive ? (
                        <Tag color="success" icon={<Check size={12} />} style={{ margin: 0 }}>Actif</Tag>
                      ) : null}
                    </div>
                    <div className="tpl-card-meta">
                      <span><FileText size={13} /> Version {tpl.version}</span>
                      {tpl.updatedAt && <span>MàJ {new Date(tpl.updatedAt).toLocaleDateString("fr-FR")}</span>}
                    </div>
                    <pre className="tpl-card-preview">
                      {(tpl.body || "").slice(0, 220)}
                      {(tpl.body || "").length > 220 ? "…" : ""}
                    </pre>
                    <div className="tpl-card-actions">
                      <Button size="small" icon={<Pencil size={14} />} onClick={() => setEditing(tpl)}>
                        Éditer
                      </Button>
                      <Button
                        size="small"
                        icon={<Eye size={14} />}
                        onClick={() => {
                          setEditing(tpl);
                          setPreviewOpen(true);
                        }}
                      >
                        Aperçu
                      </Button>
                      <Button size="small" icon={<Copy size={14} />} onClick={() => handleDuplicate(tpl.id)}>
                        Dupliquer
                      </Button>
                      {!tpl.isActive && (
                        <Button
                          size="small"
                          type="primary"
                          icon={<Star size={14} />}
                          onClick={() => handleSetActive(tpl.id)}
                        >
                          Activer
                        </Button>
                      )}
                      {!tpl.isActive && (
                        <Popconfirm
                          title="Supprimer ce modèle ?"
                          okText="Supprimer"
                          cancelText="Annuler"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDelete(tpl.id)}
                        >
                          <Button size="small" danger icon={<Trash2 size={14} />}>
                            Supprimer
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="immo-empty">
                <h3>Aucun modèle {type.label.toLowerCase()}</h3>
                <p>
                  Crée un modèle pour ce type de bail. Il sera proposé automatiquement à la génération
                  d'un contrat lié à un bien correspondant.
                </p>
              </div>
            )}
          </section>
        ))}

        <Modal
          open={Boolean(editing)}
          title={editing?.id ? `Éditer — ${editing?.name}` : "Nouveau modèle de contrat"}
          width={1100}
          onCancel={() => {
            setEditing(null);
            setPreviewOpen(false);
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setEditing(null);
                setPreviewOpen(false);
              }}
            >
              Annuler
            </Button>,
            <Button
              key="preview"
              icon={<Eye size={14} />}
              onClick={() => setPreviewOpen((v) => !v)}
            >
              {previewOpen ? "Masquer aperçu" : "Aperçu"}
            </Button>,
            <Button key="save" type="primary" loading={templatesLoading} onClick={handleSave}>
              {editing?.id ? "Enregistrer" : "Créer le modèle"}
            </Button>,
          ]}
          destroyOnClose
        >
          {editing && (
            <div className="tpl-editor">
              <div className="tpl-editor-form">
                <Form layout="vertical" component="div">
                  <div className="tpl-editor-row">
                    <Form.Item label="Nom du modèle" required>
                      <Input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        placeholder="Bail résidentiel standard"
                      />
                    </Form.Item>
                    <Form.Item label="Type">
                      <Select
                        value={editing.type}
                        onChange={(value) => setEditing({ ...editing, type: value })}
                        options={TYPE_OPTIONS}
                      />
                    </Form.Item>
                  </div>
                  <Form.Item label="Description">
                    <Input
                      value={editing.description || ""}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      placeholder="Notes courtes (modèle, juridiction, etc.)"
                    />
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Contenu du modèle&nbsp;
                        <span className="tpl-hint">utilise <code>[VARIABLE]</code> pour insérer des champs dynamiques</span>
                      </span>
                    }
                    required
                  >
                    <Input.TextArea
                      autoSize={{ minRows: 18, maxRows: 30 }}
                      value={editing.body}
                      onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                      placeholder="Saisis ici le texte du contrat avec les balises [VARIABLE]"
                    />
                  </Form.Item>
                  <label className="tpl-active-switch">
                    <input
                      type="checkbox"
                      checked={editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />
                    Définir comme modèle actif pour ce type
                    <span className="tpl-hint">
                      (les autres modèles {TYPE_LABELS[editing.type]?.toLowerCase()} seront désactivés)
                    </span>
                  </label>
                </Form>
              </div>
              <aside className="tpl-editor-side">
                <h4>Variables disponibles</h4>
                <p className="tpl-hint">Clique pour insérer dans l'éditeur (ajoute à la fin)</p>
                {VARIABLE_GROUPS.map((group) => (
                  <div key={group.title} className="tpl-var-group">
                    <strong>{group.title}</strong>
                    <div>
                      {group.items.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          className="tpl-var-chip"
                          onClick={() =>
                            setEditing((current) => ({
                              ...current,
                              body: `${current.body || ""}${current.body?.endsWith("\n") ? "" : "\n"}[${variable}]`,
                            }))
                          }
                        >
                          [{variable}]
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </aside>
              {previewOpen && (
                <div className="tpl-preview">
                  <h4>Aperçu (avec données d'exemple)</h4>
                  <pre>{applySample(editing.body || "")}</pre>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </UserPrivateComponent>
  );
}
