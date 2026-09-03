import { useState } from "react";
import { Settings, Workflow, Bell, Users } from "lucide-react";
import { useApi } from "../data.js";
import { api } from "../api.js";

export function Parametres() {
  const { data: workflows, loading, error, reload } = useApi(() => api.listWorkflows(), []);
  const wfList = Array.isArray(workflows) ? workflows : [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Paramètres</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>Configuration des workflows et préférences</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Workflows définis */}
        <div className="card" style={{ padding: 16, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div className="metric-icon iris" style={{ width: 32, height: 32, margin: 0 }}>
              <Workflow size={15} />
            </div>
            <div className="eyebrow">Circuits d'approbation définis</div>
          </div>

          {loading && <div className="muted" style={{ fontSize: 13 }}>Chargement…</div>}
          {error && <div className="api-error">{error}</div>}

          {!loading && wfList.length === 0 && (
            <div className="empty" style={{ padding: "20px 0" }}>
              <div className="muted">Aucun workflow configuré. Créez-en un via l'API ou le CRM.</div>
            </div>
          )}

          {wfList.map((wf) => (
            <div key={wf.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{wf.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Clé : <code style={{ background: "var(--ink-100)", padding: "1px 6px", borderRadius: 4 }}>{wf.key}</code>
                  {" · "}{Array.isArray(wf.steps) ? wf.steps.length : "?"} étape(s)
                </div>
              </div>
              <span className={`chip ${wf.isActive ? "chip-emerald" : "chip-ink"}`}>
                {wf.isActive ? "Actif" : "Inactif"}
              </span>
            </div>
          ))}
        </div>

        {/* Catégories → workflows */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div className="metric-icon amber" style={{ width: 32, height: 32, margin: 0 }}>
              <Settings size={15} />
            </div>
            <div className="eyebrow">Catégories de tickets</div>
          </div>
          {[
            { key: "payment",  label: "Paiement",  icon: "💳", desc: "Paiements fournisseurs, transferts" },
            { key: "purchase", label: "Achat",      icon: "🛍️", desc: "Bons de commande, achats matériel" },
            { key: "leave",    label: "Congé",      icon: "📅", desc: "Demandes de congé, absences" },
            { key: "other",    label: "Autre",      icon: "📋", desc: "Toute demande non catégorisée" },
          ].map((cat) => (
            <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--ink-100)" }}>
              <span style={{ fontSize: 18 }}>{cat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.label}</div>
                <div className="muted" style={{ fontSize: 11 }}>{cat.desc}</div>
              </div>
              <code style={{ fontSize: 11, background: "var(--ink-100)", padding: "2px 6px", borderRadius: 4, color: "var(--ink-600)" }}>{cat.key}</code>
            </div>
          ))}
        </div>

        {/* Informations */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div className="metric-icon emerald" style={{ width: 32, height: 32, margin: 0 }}>
              <Bell size={15} />
            </div>
            <div className="eyebrow">À propos</div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-700)" }}>
            <p style={{ margin: "0 0 8px" }}>
              Les tickets sont traités par le moteur <strong>WorkflowService</strong> de SIFA
              (tables <code style={{ background: "var(--ink-100)", padding: "1px 5px", borderRadius: 4 }}>workflow_instances</code> / <code style={{ background: "var(--ink-100)", padding: "1px 5px", borderRadius: 4 }}>workflow_approvals</code>, migration 0108).
            </p>
            <p style={{ margin: 0 }}>
              À l'approbation finale, le montant est comptabilisé automatiquement au <strong>ledger SIFA</strong> via <code style={{ background: "var(--ink-100)", padding: "1px 5px", borderRadius: 4 }}>ledgerApprovalRequirements</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
