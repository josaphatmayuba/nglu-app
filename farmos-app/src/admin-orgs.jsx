/* eslint-disable */
// Admin Orgs — Dashboard super-propriétaire pour gérer les organisations
// Mockup fonctionnel: liste orgs, créer, sélectionner, tout cliquable

import React from "react";
import { Icon } from "./icons";

export function AdminOrgsScreen() {
  // État local simulé (pas d'API réelle encore)
  const [orgs, setOrgs] = React.useState([
    { id: 1, name: "Ferme Principale", slug: "ferme-principale", status: "active", usersCount: 5, lastActivity: "2026-06-20" },
    { id: 2, name: "Ferme Secondaire", slug: "ferme-secondaire", status: "active", usersCount: 2, lastActivity: "2026-06-15" },
  ]);
  const [activeOrgId, setActiveOrgId] = React.useState(1);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [formData, setFormData] = React.useState({ name: "", slug: "" });
  const [error, setError] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);

  const handleCreateOrg = (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.name.trim()) {
      setError("Le nom de l'entreprise est requis");
      return;
    }

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-");

    // Vérifier unicité du slug
    if (orgs.some((o) => o.slug === slug)) {
      setError("Cet identifiant existe déjà");
      return;
    }

    // Créer l'org (simulée)
    const newOrg = {
      id: Math.max(...orgs.map((o) => o.id), 0) + 1,
      name: formData.name,
      slug: slug,
      status: "active",
      usersCount: 1,
      lastActivity: new Date().toISOString().split("T")[0],
    };

    setOrgs([...orgs, newOrg]);
    setFormData({ name: "", slug: "" });
    setShowCreateForm(false);
    setSuccessMsg(`Entreprise "${newOrg.name}" créée avec succès !`);
    setActiveOrgId(newOrg.id); // Basculer vers la nouvelle org
  };

  const handleSwitchOrg = (orgId) => {
    setActiveOrgId(orgId);
    setSuccessMsg(`Contexte basculé vers "${orgs.find((o) => o.id === orgId).name}"`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSuspendOrg = (orgId) => {
    if (orgId === activeOrgId) {
      setError("Impossible de suspendre l'org active");
      return;
    }
    setOrgs(
      orgs.map((o) =>
        o.id === orgId ? { ...o, status: o.status === "active" ? "suspended" : "active" } : o
      )
    );
  };

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  return (
    <div className="admin-orgs-screen">
      {/* Header */}
      <div className="admin-orgs-header">
        <h1>Gestion des entreprises</h1>
        <p className="subtitle">Créer, basculer et gérer vos organisations</p>
      </div>

      {/* Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Sélecteur d'org active + créer */}
      <div className="org-selector-section">
        <div className="org-selector-group">
          <label htmlFor="org-select" className="label">
            Contexte actif
          </label>
          <select
            id="org-select"
            className="input input-lg"
            value={activeOrgId}
            onChange={(e) => handleSwitchOrg(Number(e.target.value))}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} {o.status === "suspended" ? "(Suspendue)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setShowCreateForm(true)}
          title="Créer une nouvelle entreprise"
        >
          + Créer une entreprise
        </button>
      </div>

      {/* Info org active */}
      {activeOrg && (
        <div className="active-org-card">
          <div className="card-header">
            <h2>{activeOrg.name}</h2>
            <span className={`badge badge-${activeOrg.status}`}>{activeOrg.status === "active" ? "Active" : "Suspendue"}</span>
          </div>
          <div className="card-body">
            <div className="org-details">
              <div className="detail-item">
                <span className="label">Identifiant:</span>
                <span className="value">{activeOrg.slug}</span>
              </div>
              <div className="detail-item">
                <span className="label">Utilisateurs:</span>
                <span className="value">{activeOrg.usersCount}</span>
              </div>
              <div className="detail-item">
                <span className="label">Dernière activité:</span>
                <span className="value">{activeOrg.lastActivity}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des orgs */}
      <div className="orgs-list-section">
        <h2>Toutes les entreprises ({orgs.length})</h2>
        <div className="orgs-grid">
          {orgs.map((org) => (
            <div
              key={org.id}
              className={`org-card ${org.id === activeOrgId ? "org-card-active" : ""}`}
              onClick={() => handleSwitchOrg(org.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleSwitchOrg(org.id);
              }}
            >
              <div className="org-card-header">
                <h3>{org.name}</h3>
                <span className={`badge badge-${org.status}`}>
                  {org.status === "active" ? "✓ Active" : "⊘ Suspendue"}
                </span>
              </div>
              <div className="org-card-body">
                <div className="org-stat">
                  <span className="stat-label">Utilisateurs</span>
                  <span className="stat-value">{org.usersCount}</span>
                </div>
                <div className="org-stat">
                  <span className="stat-label">Dernière activité</span>
                  <span className="stat-value">{org.lastActivity}</span>
                </div>
              </div>
              <div className="org-card-footer">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwitchOrg(org.id);
                  }}
                >
                  Sélectionner
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSuspendOrg(org.id);
                  }}
                  disabled={org.id === activeOrgId}
                  title={org.id === activeOrgId ? "Impossible de suspendre l'org active" : ""}
                >
                  {org.status === "active" ? "Suspendre" : "Réactiver"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modale création */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Créer une nouvelle entreprise</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreateForm(false)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOrg} className="modal-form">
              <div className="form-group">
                <label htmlFor="org-name" className="label">
                  Nom de l'entreprise *
                </label>
                <input
                  id="org-name"
                  type="text"
                  className="input"
                  placeholder="Ex: Ferme Bio de Matete"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="org-slug" className="label">
                  Identifiant (slug)
                </label>
                <input
                  id="org-slug"
                  type="text"
                  className="input"
                  placeholder="Auto-généré si vide"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                  }
                />
                <small className="hint">
                  {formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-")}
                </small>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Créer l'entreprise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-orgs-screen {
          padding: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
          background: var(--bg-primary, #ffffff);
          min-height: 100vh;
        }

        .admin-orgs-header {
          margin-bottom: 2rem;
        }

        .admin-orgs-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: var(--text-primary, #1a1a1a);
        }

        .subtitle {
          margin: 0;
          color: var(--text-secondary, #666);
          font-size: 0.95rem;
        }

        .alert {
          padding: 1rem;
          margin-bottom: 1.5rem;
          border-radius: 0.5rem;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .alert-error {
          background: #fee;
          color: #c00;
          border-left: 4px solid #c00;
        }

        .alert-success {
          background: #efe;
          color: #060;
          border-left: 4px solid #060;
        }

        .org-selector-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          align-items: flex-end;
        }

        .org-selector-group {
          flex: 1;
          min-width: 200px;
        }

        .label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-primary, #1a1a1a);
        }

        .input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 0.375rem;
          font-size: 0.95rem;
          font-family: inherit;
        }

        .input-lg {
          padding: 0.875rem;
          font-size: 1rem;
        }

        .input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .btn {
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-ghost {
          background: transparent;
          color: #007bff;
          border: 1px solid #007bff;
        }

        .btn-ghost:hover:not(:disabled) {
          background: rgba(0, 123, 255, 0.1);
        }

        .btn-lg {
          padding: 0.875rem 1.5rem;
          font-size: 1rem;
        }

        .btn-sm {
          padding: 0.5rem 0.875rem;
          font-size: 0.85rem;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .badge-active {
          background: #d4edda;
          color: #155724;
        }

        .badge-suspended {
          background: #f8d7da;
          color: #721c24;
        }

        .active-org-card {
          background: #f8f9fa;
          border: 2px solid #007bff;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
          overflow: hidden;
        }

        .card-header {
          padding: 1rem 1.5rem;
          background: #007bff;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .card-body {
          padding: 1.5rem;
        }

        .org-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-item .label {
          margin-bottom: 0.25rem;
          color: var(--text-secondary, #666);
        }

        .detail-item .value {
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
        }

        .orgs-list-section {
          margin-top: 2rem;
        }

        .orgs-list-section h2 {
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .orgs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .org-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .org-card:hover {
          border-color: #007bff;
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
        }

        .org-card-active {
          border-color: #007bff;
          background: #f0f7ff;
        }

        .org-card-header {
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #e0e0e0;
        }

        .org-card-header h3 {
          margin: 0;
          font-size: 1.1rem;
          flex: 1;
        }

        .org-card-body {
          padding: 1.25rem;
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .org-stat {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
          font-weight: 500;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-primary, #1a1a1a);
        }

        .org-card-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 0.5rem;
        }

        .org-card-footer .btn {
          flex: 1;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .modal-form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group input {
          width: 100%;
        }

        .hint {
          display: block;
          margin-top: 0.375rem;
          font-size: 0.85rem;
          color: var(--text-secondary, #666);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e0e0e0;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .admin-orgs-screen {
            padding: 1rem;
          }

          .admin-orgs-header h1 {
            font-size: 1.35rem;
          }

          .org-selector-section {
            flex-direction: column;
          }

          .org-selector-group {
            min-width: 100%;
          }

          .btn-lg {
            width: 100%;
          }

          .orgs-grid {
            grid-template-columns: 1fr;
          }

          .org-details {
            grid-template-columns: 1fr;
          }

          .modal-overlay {
            align-items: flex-end;
          }

          .modal-content {
            border-radius: 0.75rem 0.75rem 0 0;
          }
        }
      `}</style>
    </div>
  );
}
