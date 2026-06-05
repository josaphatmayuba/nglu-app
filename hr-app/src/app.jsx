import React from "react";
import { api } from "./api.js";
import { LoginScreen, useAuthToken } from "./auth.jsx";
import { fallback } from "./data.js";

const routes = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "staff", label: "Personnel" },
  { id: "shifts", label: "Horaires" },
  { id: "awards", label: "Reconnaissance" },
  { id: "payroll", label: "Paie" }
];

const money = (value) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || u.email || `Employe #${u.id}`;

export default function AppShell() {
  const token = useAuthToken();
  if (!token) return <LoginScreen />;
  return <App />;
}

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [data, setData] = React.useState({ ...fallback });
  const [apiStatus, setApiStatus] = React.useState("local");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    let alive = true;
    Promise.allSettled([api.overview(), api.shifts(), api.awards(), api.salaryHistory()])
      .then(([overview, shifts, awards, salaries]) => {
        if (!alive) return;
        const next = {
          staff: overview.value?.staff || fallback.staff,
          designations: overview.value?.designations || fallback.designations,
          departments: overview.value?.departments || fallback.departments,
          shifts: Array.isArray(shifts.value) ? shifts.value : fallback.shifts,
          awards: awards.value?.getAllAward || awards.value || fallback.awards,
          salaries: salaries.value?.getAllSalaryHistory || fallback.salaries
        };
        const ok = [overview, shifts, awards, salaries].some((r) => r.status === "fulfilled");
        setData(next);
        setApiStatus(ok ? "api" : "local");
      })
      .catch(() => setApiStatus("local"));
    return () => { alive = false; };
  }, []);
  React.useEffect(() => load(), [load]);

  async function save(kind, form) {
    setBusy(true);
    setError("");
    try {
      if (kind === "designation") await api.createDesignation({ name: form.name });
      if (kind === "shift") await api.createShift({ name: form.name, startTime: form.startTime, endTime: form.endTime });
      if (kind === "award") await api.createAward({ name: form.name, description: form.description || null });
      if (kind === "salary") await api.createSalary({
        userId: Number(form.userId),
        salary: Number(form.salary),
        salaryStartDate: form.salaryStartDate,
        salaryComment: form.salaryComment || null,
        paymentAccountId: Number(form.paymentAccountId || 2)
      });
      setModal(null);
      load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const activeStaff = data.staff.filter((s) => s.status !== "false");
  const payroll = activeStaff.reduce((sum, user) => sum + Number(user.currentSalary || 0), 0);
  const departments = new Set(activeStaff.map((u) => u.department?.name).filter(Boolean));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/hr/"><span className="brand-icon">RH</span><span><strong>Ressources</strong><small>Humaines</small></span></a>
        <nav>{routes.map((item) => <button key={item.id} className={route === item.id ? "active" : ""} onClick={() => setRoute(item.id)}>{item.label}</button>)}</nav>
        <a className="crm-link" href="/admin/">Retour CRM</a>
      </aside>
      <main className="content">
        <header className="topbar">
          <div><p>Application RH</p><h1>{routes.find((r) => r.id === route)?.label}</h1></div>
          <div className="topbar-actions">
            <span className={`source-pill ${apiStatus}`}>{apiStatus === "api" ? "API" : "Local"}</span>
            <button className="primary" disabled={apiStatus !== "api"} onClick={() => setModal({ kind: "salary" })}>Nouvelle paie</button>
          </div>
        </header>
        {error && <div className="inline-error">{error}</div>}
        {route === "dashboard" && <Dashboard staff={activeStaff} payroll={payroll} departments={departments} shifts={data.shifts} awards={data.awards} onOpen={setRoute} />}
        {route === "staff" && <StaffPanel staff={activeStaff} onNew={() => setModal({ kind: "designation" })} canMutate={apiStatus === "api"} />}
        {route === "shifts" && <ShiftPanel shifts={data.shifts} onNew={() => setModal({ kind: "shift" })} canMutate={apiStatus === "api"} />}
        {route === "awards" && <AwardsPanel awards={data.awards} onNew={() => setModal({ kind: "award" })} canMutate={apiStatus === "api"} />}
        {route === "payroll" && <PayrollPanel staff={activeStaff} salaries={data.salaries} payroll={payroll} onNew={() => setModal({ kind: "salary" })} canMutate={apiStatus === "api"} />}
      </main>
      {modal && <RecordModal modal={modal} staff={activeStaff} busy={busy} error={error} onSave={save} onClose={() => setModal(null)} />}
    </div>
  );
}

function Dashboard({ staff, payroll, departments, shifts, awards, onOpen }) {
  return (
    <>
      <section className="metrics">
        <Metric label="Employes actifs" value={staff.length} helper="contrats suivis" />
        <Metric label="Masse salariale" value={money(payroll)} helper="dernier salaire connu" />
        <Metric label="Departements" value={departments.size} helper="equipes rattachees" />
        <Metric label="Horaires" value={shifts.length} helper={`${awards.length} recompense(s)`} />
      </section>
      <section className="dashboard-grid">
        <StaffPanel staff={staff.slice(0, 5)} compact onNew={() => onOpen("staff")} />
        <section className="panel">
          <div className="panel-head"><h2>Priorites RH</h2><span>Cette semaine</span></div>
          <div className="timeline">
            <Item title="Verifier contrats" text={`${staff.length} dossiers personnel a jour`} />
            <Item title="Cloturer paie" text={`${money(payroll)} a rapprocher en comptabilite`} />
            <Item title="Planifier equipes" text={`${shifts.length} plages horaires configurees`} />
          </div>
        </section>
      </section>
    </>
  );
}

function Metric({ label, value, helper }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>;
}

function StaffPanel({ staff, compact = false, canMutate = false, onNew }) {
  return (
    <section className={`panel ${compact ? "" : "wide"}`}>
      <div className="panel-head"><h2>Personnel</h2><span>{staff.length} employes</span>{canMutate && <button className="mini-action" onClick={onNew}>Poste</button>}</div>
      <div className="staff-grid">
        {staff.map((user) => (
          <article className="staff-card" key={user.id}>
            <div className="avatar">{fullName(user).slice(0, 2).toUpperCase()}</div>
            <div><strong>{fullName(user)}</strong><span>{user.designation?.name || "Poste non assigne"}</span></div>
            <em>{user.department?.name || "Departement"}</em>
            <b>{money(user.currentSalary)}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShiftPanel({ shifts, canMutate, onNew }) {
  return (
    <section className="panel wide">
      <div className="panel-head"><h2>Horaires</h2><span>{shifts.length} plages</span>{canMutate && <button className="mini-action" onClick={onNew}>Ajouter</button>}</div>
      <div className="table">{shifts.map((s) => <div className="table-row" key={s.id}><strong>{s.name}</strong><span>{s.startTime}</span><span>{s.endTime}</span><em>{s.workHour || "-"} h</em></div>)}</div>
    </section>
  );
}

function AwardsPanel({ awards, canMutate, onNew }) {
  return (
    <section className="panel wide">
      <div className="panel-head"><h2>Reconnaissance</h2><span>{awards.length} programmes</span>{canMutate && <button className="mini-action" onClick={onNew}>Ajouter</button>}</div>
      <div className="award-grid">{awards.map((a) => <article className="award-card" key={a.id}><strong>{a.name}</strong><span>{a.description || "Programme actif"}</span></article>)}</div>
    </section>
  );
}

function PayrollPanel({ staff, salaries, payroll, canMutate, onNew }) {
  return (
    <section className="panel wide">
      <div className="panel-head"><h2>Paie</h2><span>{money(payroll)}</span>{canMutate && <button className="mini-action" onClick={onNew}>Ajouter</button>}</div>
      <div className="table">
        {salaries.map((s) => {
          const user = staff.find((u) => u.id === s.userId);
          return <div className="table-row payroll" key={s.id}><strong>{user ? fullName(user) : `Employe #${s.userId}`}</strong><span>{s.startDate || "-"}</span><span>{s.comment || "Salaire"}</span><em>{money(s.salary)}</em></div>;
        })}
      </div>
    </section>
  );
}

function Item({ title, text }) {
  return <article className="timeline-item"><strong>{title}</strong><span>{text}</span></article>;
}

function RecordModal({ modal, staff, busy, error, onSave, onClose }) {
  const [form, setForm] = React.useState(defaults(modal.kind, staff));
  const set = (key, value) => setForm((cur) => ({ ...cur, [key]: value }));
  return (
    <div className="modal-scrim">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(modal.kind, form); }}>
        <div className="modal-head"><h2>{titleFor(modal.kind)}</h2><button type="button" className="icon-btn" onClick={onClose}>x</button></div>
        <div className="form-grid">
          {modal.kind !== "salary" && <Field label="Nom" value={form.name} onChange={(v) => set("name", v)} required />}
          {modal.kind === "shift" && <><Field label="Debut" type="time" value={form.startTime} onChange={(v) => set("startTime", v)} required /><Field label="Fin" type="time" value={form.endTime} onChange={(v) => set("endTime", v)} required /></>}
          {modal.kind === "award" && <Field label="Description" value={form.description} onChange={(v) => set("description", v)} />}
          {modal.kind === "salary" && (
            <>
              <label className="field"><span>Employe</span><select value={form.userId} onChange={(e) => set("userId", e.target.value)}>{staff.map((u) => <option key={u.id} value={u.id}>{fullName(u)}</option>)}</select></label>
              <Field label="Montant" type="number" value={form.salary} onChange={(v) => set("salary", v)} required />
              <Field label="Date" type="date" value={form.salaryStartDate} onChange={(v) => set("salaryStartDate", v)} required />
              <Field label="Compte credit" type="number" value={form.paymentAccountId} onChange={(v) => set("paymentAccountId", v)} />
              <Field label="Commentaire" value={form.salaryComment} onChange={(v) => set("salaryComment", v)} />
            </>
          )}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions"><button type="button" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>{busy ? "Enregistrement..." : "Enregistrer"}</button></div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return <label className="field"><span>{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function titleFor(kind) {
  return kind === "shift" ? "Nouvel horaire" : kind === "award" ? "Nouvelle reconnaissance" : kind === "salary" ? "Nouvelle paie" : "Nouveau poste";
}

function defaults(kind, staff) {
  if (kind === "shift") return { name: "", startTime: "08:00", endTime: "17:00" };
  if (kind === "award") return { name: "", description: "" };
  if (kind === "salary") return { userId: staff[0]?.id || "", salary: 0, salaryStartDate: new Date().toISOString().slice(0, 10), salaryComment: "", paymentAccountId: 2 };
  return { name: "" };
}
