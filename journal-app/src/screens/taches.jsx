import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckSquare, X, Clock } from "lucide-react";
import { api } from "../api.js";
import { useRealtimeReload } from "../realtime.js";
import { t } from "../i18n.js";
import { formatDate } from "./shared.jsx";

export function Taches() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    const params = filter !== "all" ? { status: filter } : {};
    api.tasks(params)
      .then((d) => setTasks(Array.isArray(d) ? d : (d?.data || [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);
  useRealtimeReload(load, ["journal-tasks"]);

  const toggle = async (task) => {
    try { await api.toggleTask(task.id); load(); } catch (e) { setError(e.message); }
  };

  const del = async (task) => {
    if (!confirm(`Supprimer "${task.title}" ?`)) return;
    try { await api.deleteTask(task.id); load(); } catch (e) { setError(e.message); }
  };

  const open = tasks.filter((t) => !t.isDone);
  const done = tasks.filter((t) => t.isDone);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="title">{t("Tâches & rappels")}</h1>
          <p className="muted" style={{ margin:"4px 0 0", fontSize:13 }}>Suivi des actions et rappels lies aux evenements</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouvelle tache
        </button>
      </div>

      {error && <div className="api-error" style={{ marginBottom:12 }}>{error}</div>}

      {/* Filtre */}
      <div className="source-filter" style={{ marginBottom:16 }}>
        {[["all","Toutes"],["open","Ouvertes"],["done","Terminees"]].map(([v, l]) => (
          <button key={v} className={`source-btn ${filter === v ? "active" : ""}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:40 }}><div className="spinner" /></div>
      ) : (
        <>
          {(filter === "all" || filter === "open") && (
            <div style={{ marginBottom:20 }}>
              <div className="task-section-head">
                <span className="task-section-label">En cours ({open.length})</span>
                <span className="chip chip-amber">{open.filter(t => isOverdue(t.dueDate)).length} en retard</span>
              </div>
              {open.length === 0 ? (
                <div className="card" style={{ padding:20, textAlign:"center" }}>
                  <CheckSquare size={28} color="var(--emerald)" style={{ marginBottom:8 }} />
                  <p className="muted" style={{ margin:0 }}>Tout est a jour !</p>
                </div>
              ) : (
                <div className="task-list">
                  {open.map((task) => <TaskRow key={task.id} task={task} onToggle={toggle} onEdit={setEditTask} onDelete={del} />)}
                </div>
              )}
            </div>
          )}
          {(filter === "all" || filter === "done") && done.length > 0 && (
            <div>
              <div className="task-section-head">
                <span className="task-section-label">Terminees ({done.length})</span>
              </div>
              <div className="task-list">
                {done.map((task) => <TaskRow key={task.id} task={task} onToggle={toggle} onEdit={setEditTask} onDelete={del} />)}
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && <TaskModal onClose={() => { setShowCreate(false); load(); }} />}
      {editTask && <TaskModal task={editTask} onClose={() => { setEditTask(null); load(); }} />}
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }) {
  const overdue = !task.isDone && isOverdue(task.dueDate);
  return (
    <div className={`task-row ${task.isDone ? "done" : ""}`}>
      <button className={`task-check ${task.isDone ? "checked" : ""}`} onClick={() => onToggle(task)}>
        {task.isDone && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
      </button>
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {task.dueDate && (
            <span style={{ color: overdue ? "var(--rose)" : "inherit", display:"flex", alignItems:"center", gap:3 }}>
              <Clock size={11} /> {formatDate(task.dueDate)}{overdue ? " (en retard)" : ""}
            </span>
          )}
          {task.priority && <span className={`chip ${task.priority === "haute" ? "chip-rose" : task.priority === "moyenne" ? "chip-amber" : "chip-emerald"}`}>{task.priority}</span>}
          {task.sourceModule && <span className="chip chip-ink">{task.sourceModule}</span>}
        </div>
        {task.notes && <div style={{ fontSize:12, color:"var(--ink-500)", marginTop:4 }}>{task.notes}</div>}
      </div>
      <div className="task-actions">
        <button onClick={() => onEdit(task)}><Edit2 size={13} /></button>
        <button onClick={() => onDelete(task)}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

export function TaskModal({ task, onClose }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || "",
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : "",
    priority: task?.priority || "basse",
    sourceModule: task?.sourceModule || "general",
    notes: task?.notes || "",
    reminderDate: task?.reminderDate ? task.reminderDate.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Le titre est obligatoire."); return; }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) { await api.updateTask(task.id, form); }
      else { await api.createTask(form); }
      onClose();
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card">
        <div className="modal-head">
          <h2>{isEdit ? "Modifier la tache" : "Nouvelle tache"}</h2>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          {error && <div className="api-error" style={{ marginBottom:12 }}>{error}</div>}
          <div className="form-grid">
            <div className="field">
              <span>Titre <b style={{ color:"var(--rose)" }}>*</b></span>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Description de la tache" autoFocus />
            </div>
            <div className="form-grid two">
              <div className="field">
                <span>Echeance</span>
                <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
              <div className="field">
                <span>Rappel</span>
                <input type="date" value={form.reminderDate} onChange={(e) => set("reminderDate", e.target.value)} />
              </div>
              <div className="field">
                <span>Priorite</span>
                <select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                </select>
              </div>
              <div className="field">
                <span>Module source</span>
                <select value={form.sourceModule} onChange={(e) => set("sourceModule", e.target.value)}>
                  <option value="general">Général</option>
                  <option value="comptabilite">Comptabilité</option>
                  <option value="domus">Domus</option>
                  <option value="batipro">BâtiPro</option>
                  <option value="rh">RH</option>
                  <option value="farmos">FarmOS</option>
                </select>
              </div>
            </div>
            <div className="field">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes supplementaires…" rows={3} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : isEdit ? "Mettre a jour" : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
