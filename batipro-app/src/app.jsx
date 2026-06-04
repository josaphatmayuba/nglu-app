import React from "react";
import { api } from "./api.js";
import { LoginScreen, useAuthToken } from "./auth.jsx";
import { crews as fallbackCrews, materials as fallbackMaterials, projects as fallbackProjects, tasks as fallbackTasks } from "./data.js";

const routes = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "projects", label: "Chantiers" },
  { id: "planning", label: "Planning" },
  { id: "materials", label: "Materiaux" },
  { id: "crews", label: "Equipes" },
  { id: "finances", label: "Budgets" }
];

function money(value) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}
const n = (value) => Number(value || 0);
const projectDue = (project) => project.dueDate || project.due || "-";
const taskDate = (task) => task.taskDate || task.date || "-";
const materialMin = (material) => n(material.minStock ?? material.min);

function AppShell() {
  const token = useAuthToken();
  if (!token) return <LoginScreen />;
  return <App />;
}

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [snapshot, setSnapshot] = React.useState(null);
  const [apiStatus, setApiStatus] = React.useState("local");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const loadDashboard = React.useCallback(() => {
    let alive = true;
    api.dashboard()
      .then((data) => {
        if (!alive) return;
        setSnapshot(data);
        setApiStatus("api");
      })
      .catch(() => {
        if (!alive) return;
        setApiStatus("local");
      });
    return () => { alive = false; };
  }, []);
  React.useEffect(() => loadDashboard(), [loadDashboard]);
  const projectRows = snapshot?.projects || fallbackProjects;
  const taskRows = snapshot?.tasks || fallbackTasks;
  const materialRows = snapshot?.materials || fallbackMaterials;
  const crewRows = snapshot?.crews || fallbackCrews;
  const activeProjects = projectRows.filter((p) => p.status !== "Livre");
  const totalBudget = snapshot?.metrics?.totalBudget ?? projectRows.reduce((sum, p) => sum + n(p.budget), 0);
  const totalSpent = snapshot?.metrics?.totalSpent ?? projectRows.reduce((sum, p) => sum + n(p.spent), 0);
  const averageProgress = snapshot?.metrics?.averageProgress ?? Math.round(projectRows.reduce((s, p) => s + n(p.progress), 0) / Math.max(1, projectRows.length));
  const lateTasks = snapshot?.metrics?.blockedTasks ?? taskRows.filter((t) => t.status === "Bloque").length;
  const canMutate = apiStatus === "api";

  const saveRecord = async (kind, form) => {
    setBusy(true);
    setError("");
    try {
      const payload = payloadFor(kind, form);
      if (kind === "project") {
        form.id ? await api.updateProject(form.id, payload) : await api.createProject(payload);
      } else if (kind === "task") {
        form.id ? await api.updateTask(form.id, payload) : await api.createTask(payload);
      } else if (kind === "material") {
        form.id ? await api.updateMaterial(form.id, payload) : await api.createMaterial(payload);
      } else if (kind === "crew") {
        form.id ? await api.updateCrew(form.id, payload) : await api.createCrew(payload);
      }
      setModal(null);
      loadDashboard();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteRecord = async (kind, record) => {
    if (!canMutate || !record?.id) return;
    if (!window.confirm("Supprimer cet element ?")) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "project") await api.deleteProject(record.id);
      if (kind === "task") await api.deleteTask(record.id);
      if (kind === "material") await api.deleteMaterial(record.id);
      if (kind === "crew") await api.deleteCrew(record.id);
      loadDashboard();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/batipro/" aria-label="BatiPro accueil">
          <span className="brand-icon">BP</span>
          <span>
            <strong>BatiPro</strong>
            <small>Construction</small>
          </span>
        </a>
        <nav>
          {routes.map((item) => (
            <button key={item.id} className={route === item.id ? "active" : ""} onClick={() => setRoute(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <a className="crm-link" href="/admin/">Retour CRM</a>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p>BatiPro Construction</p>
            <h1>{routes.find((r) => r.id === route)?.label || "Tableau de bord"}</h1>
          </div>
          <div className="topbar-actions">
            <span className={`source-pill ${apiStatus}`}>{apiStatus === "api" ? "API" : "Local"}</span>
            <button className="primary" disabled={!canMutate} onClick={() => setModal({ kind: "project", record: null })}>Nouveau chantier</button>
          </div>
        </header>
        {error && <div className="inline-error">{error}</div>}

        {route === "dashboard" && (
          <>
            <section className="metrics">
              <Metric label="Chantiers actifs" value={activeProjects.length} helper="sites suivis" />
              <Metric label="Budget total" value={money(totalBudget)} helper={`${money(totalSpent)} consommes`} />
              <Metric label="Avancement moyen" value={`${averageProgress}%`} helper="tous projets" />
              <Metric label="Alertes" value={lateTasks} helper="taches bloquees" danger={lateTasks > 0} />
            </section>
            <section className="dashboard-grid">
              <ProjectBoard projects={projectRows} canMutate={canMutate} onEdit={(record) => setModal({ kind: "project", record })} onDelete={(record) => deleteRecord("project", record)} />
              <TasksPanel tasks={taskRows} canMutate={canMutate} onNew={() => setModal({ kind: "task", record: null })} onEdit={(record) => setModal({ kind: "task", record })} onDelete={(record) => deleteRecord("task", record)} />
            </section>
          </>
        )}

        {route === "projects" && <ProjectBoard projects={projectRows} canMutate={canMutate} onNew={() => setModal({ kind: "project", record: null })} onEdit={(record) => setModal({ kind: "project", record })} onDelete={(record) => deleteRecord("project", record)} full />}
        {route === "planning" && <TasksPanel tasks={taskRows} canMutate={canMutate} onNew={() => setModal({ kind: "task", record: null })} onEdit={(record) => setModal({ kind: "task", record })} onDelete={(record) => deleteRecord("task", record)} full />}
        {route === "materials" && <MaterialsPanel materials={materialRows} canMutate={canMutate} onNew={() => setModal({ kind: "material", record: null })} onEdit={(record) => setModal({ kind: "material", record })} onDelete={(record) => deleteRecord("material", record)} />}
        {route === "crews" && <CrewsPanel crews={crewRows} canMutate={canMutate} onNew={() => setModal({ kind: "crew", record: null })} onEdit={(record) => setModal({ kind: "crew", record })} onDelete={(record) => deleteRecord("crew", record)} />}
        {route === "finances" && <FinancePanel projects={projectRows} />}
      </main>
      {modal && <RecordModal modal={modal} busy={busy} error={error} onClose={() => setModal(null)} onSave={saveRecord} />}
    </div>
  );
}

function Metric({ label, value, helper, danger }) {
  return (
    <article className={`metric ${danger ? "danger" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function ProjectBoard({ projects, canMutate = false, onNew, onEdit, onDelete, full = false }) {
  return (
    <section className={`panel ${full ? "wide" : ""}`}>
      <div className="panel-head">
        <h2>Chantiers</h2>
        <span>{projects.length} dossiers</span>
        {canMutate && onNew && <button className="mini-action" onClick={onNew}>Ajouter</button>}
      </div>
      <div className="project-list">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <div>
              <span className="code">{project.code}</span>
              <h3>{project.name}</h3>
              <p>{project.client} - {project.location}</p>
            </div>
            <span className={`status ${project.risk.toLowerCase()}`}>{project.risk}</span>
            <div className="progress-row">
              <span style={{ width: `${project.progress}%` }} />
            </div>
            <div className="project-meta">
              <span>{project.manager}</span>
              <strong>{project.progress}%</strong>
              <span>{projectDue(project)}</span>
            </div>
            {canMutate && (
              <div className="card-actions">
                <button onClick={() => onEdit(project)}>Modifier</button>
                <button className="danger" onClick={() => onDelete(project)}>Supprimer</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function TasksPanel({ tasks, canMutate = false, onNew, onEdit, onDelete, full = false }) {
  return (
    <section className={`panel ${full ? "wide" : ""}`}>
      <div className="panel-head">
        <h2>Planning terrain</h2>
        <span>{tasks.length} taches</span>
        {canMutate && onNew && <button className="mini-action" onClick={onNew}>Ajouter</button>}
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <article className="task-row" key={task.id}>
            <div>
              <strong>{task.label}</strong>
              <span>{task.owner} - {taskDate(task)}</span>
            </div>
            <em>{task.status}</em>
            {canMutate && (
              <div className="row-actions">
                <button onClick={() => onEdit(task)}>Modifier</button>
                <button className="danger" onClick={() => onDelete(task)}>Supprimer</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function MaterialsPanel({ materials, canMutate = false, onNew, onEdit, onDelete }) {
  return (
    <section className="panel wide">
      <div className="panel-head">
        <h2>Materiaux et stock</h2>
        <span>Depot central</span>
        {canMutate && <button className="mini-action" onClick={onNew}>Ajouter</button>}
      </div>
      <div className="table">
        {materials.map((m) => (
          <div className="table-row" key={m.name}>
            <strong>{m.name}</strong>
            <span>{m.stock} {m.unit}</span>
            <span>Reserve: {m.reserved}</span>
            <em className={n(m.stock) < materialMin(m) ? "warn" : ""}>{n(m.stock) < materialMin(m) ? "A commander" : "OK"}</em>
            {canMutate && (
              <div className="row-actions">
                <button onClick={() => onEdit(m)}>Modifier</button>
                <button className="danger" onClick={() => onDelete(m)}>Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CrewsPanel({ crews, canMutate = false, onNew, onEdit, onDelete }) {
  return (
    <section className="panel wide">
      <div className="panel-head">
        <h2>Equipes</h2>
        <span>{crews.reduce((s, c) => s + c.people, 0)} personnes</span>
        {canMutate && <button className="mini-action" onClick={onNew}>Ajouter</button>}
      </div>
      <div className="crew-grid">
        {crews.map((crew) => (
          <article className="crew-card" key={crew.name}>
            <strong>{crew.name}</strong>
            <span>{crew.site}</span>
            <b>{crew.people}</b>
            <em>{crew.status}</em>
            {canMutate && (
              <div className="card-actions">
                <button onClick={() => onEdit(crew)}>Modifier</button>
                <button className="danger" onClick={() => onDelete(crew)}>Supprimer</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function FinancePanel({ projects }) {
  return (
    <section className="panel wide">
      <div className="panel-head">
        <h2>Budgets chantier</h2>
        <span>{money(projects.reduce((s, p) => s + n(p.budget), 0))}</span>
      </div>
      <div className="project-list">
        {projects.map((project) => (
          <article className="finance-row" key={project.id}>
            <div>
              <strong>{project.name}</strong>
              <span>{money(project.spent)} / {money(project.budget)}</span>
            </div>
            <div className="progress-row">
              <span style={{ width: `${Math.min(100, Math.round((n(project.spent) / Math.max(1, n(project.budget))) * 100))}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function payloadFor(kind, form) {
  if (kind === "project") {
    return {
      code: form.code || `BAT-${Date.now()}`,
      name: form.name,
      client: form.client || null,
      manager: form.manager || null,
      status: form.status || "Planifie",
      progress: n(form.progress),
      budget: n(form.budget),
      spent: n(form.spent),
      start_date: form.startDate || form.start_date || null,
      due_date: form.dueDate || form.due_date || form.due || null,
      location: form.location || null,
      risk: form.risk || "Faible",
      notes: form.notes || null
    };
  }
  if (kind === "task") {
    return {
      project_id: form.projectId ? n(form.projectId) : form.project_id ? n(form.project_id) : undefined,
      label: form.label,
      owner: form.owner || null,
      status: form.status || "Planifie",
      task_date: form.taskDate || form.task_date || form.date || null,
      priority: form.priority || "Normale",
      notes: form.notes || null
    };
  }
  if (kind === "material") {
    return {
      name: form.name,
      unit: form.unit || "unite",
      stock: n(form.stock),
      min_stock: n(form.minStock ?? form.min_stock ?? form.min),
      reserved: n(form.reserved),
      supplier: form.supplier || null
    };
  }
  return {
    name: form.name,
    people: n(form.people),
    site: form.site || null,
    status: form.status || "Disponible",
    lead: form.lead || null
  };
}

function RecordModal({ modal, busy, error, onClose, onSave }) {
  const { kind, record } = modal;
  const [form, setForm] = React.useState(() => ({ ...(record || defaultsFor(kind)) }));
  const set = (key, value) => setForm((cur) => ({ ...cur, [key]: value }));
  const title = record ? "Modifier" : "Ajouter";
  const label = kind === "project" ? "chantier" : kind === "task" ? "tache" : kind === "material" ? "materiau" : "equipe";
  const canSave = kind === "task" ? Boolean(form.label) : Boolean(form.name);

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(kind, form); }}>
        <div className="modal-head">
          <div>
            <h2>{title} {label}</h2>
            <p>BatiPro Construction</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>x</button>
        </div>

        <div className="form-grid">
          {kind === "project" && (
            <>
              <Field label="Code" value={form.code || ""} onChange={(v) => set("code", v)} />
              <Field label="Nom" value={form.name || ""} onChange={(v) => set("name", v)} required />
              <Field label="Client" value={form.client || ""} onChange={(v) => set("client", v)} />
              <Field label="Responsable" value={form.manager || ""} onChange={(v) => set("manager", v)} />
              <Field label="Statut" value={form.status || "Planifie"} onChange={(v) => set("status", v)} />
              <Field label="Risque" value={form.risk || "Faible"} onChange={(v) => set("risk", v)} />
              <Field label="Avancement %" type="number" value={form.progress || 0} onChange={(v) => set("progress", v)} />
              <Field label="Budget" type="number" value={form.budget || 0} onChange={(v) => set("budget", v)} />
              <Field label="Depense" type="number" value={form.spent || 0} onChange={(v) => set("spent", v)} />
              <Field label="Echeance" type="date" value={form.dueDate || form.due || ""} onChange={(v) => set("dueDate", v)} />
              <Field label="Lieu" value={form.location || ""} onChange={(v) => set("location", v)} />
            </>
          )}
          {kind === "task" && (
            <>
              <Field label="Tache" value={form.label || ""} onChange={(v) => set("label", v)} required />
              <Field label="Responsable" value={form.owner || ""} onChange={(v) => set("owner", v)} />
              <Field label="Statut" value={form.status || "Planifie"} onChange={(v) => set("status", v)} />
              <Field label="Date" type="date" value={form.taskDate || form.date || ""} onChange={(v) => set("taskDate", v)} />
              <Field label="Priorite" value={form.priority || "Normale"} onChange={(v) => set("priority", v)} />
            </>
          )}
          {kind === "material" && (
            <>
              <Field label="Materiau" value={form.name || ""} onChange={(v) => set("name", v)} required />
              <Field label="Unite" value={form.unit || "unite"} onChange={(v) => set("unit", v)} />
              <Field label="Stock" type="number" value={form.stock || 0} onChange={(v) => set("stock", v)} />
              <Field label="Minimum" type="number" value={form.minStock ?? form.min ?? 0} onChange={(v) => set("minStock", v)} />
              <Field label="Reserve" type="number" value={form.reserved || 0} onChange={(v) => set("reserved", v)} />
              <Field label="Fournisseur" value={form.supplier || ""} onChange={(v) => set("supplier", v)} />
            </>
          )}
          {kind === "crew" && (
            <>
              <Field label="Equipe" value={form.name || ""} onChange={(v) => set("name", v)} required />
              <Field label="Personnes" type="number" value={form.people || 0} onChange={(v) => set("people", v)} />
              <Field label="Chantier" value={form.site || ""} onChange={(v) => set("site", v)} />
              <Field label="Statut" value={form.status || "Disponible"} onChange={(v) => set("status", v)} />
              <Field label="Chef equipe" value={form.lead || ""} onChange={(v) => set("lead", v)} />
            </>
          )}
        </div>

        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Annuler</button>
          <button className="primary" disabled={busy || !canSave}>{busy ? "Enregistrement..." : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function defaultsFor(kind) {
  if (kind === "project") return { code: "", name: "", status: "Planifie", risk: "Faible", progress: 0, budget: 0, spent: 0 };
  if (kind === "task") return { label: "", owner: "", status: "Planifie", priority: "Normale" };
  if (kind === "material") return { name: "", unit: "unite", stock: 0, minStock: 0, reserved: 0 };
  return { name: "", people: 0, site: "", status: "Disponible", lead: "" };
}

export default AppShell;
