import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Columns3,
  Eye,
  FolderKanban,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { useDateRange } from "../dateRange.jsx";
import { money, normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, DomusPropertySelect, FormSection, Modal, ModalActions } from "./biens.jsx";

const VIEWS = [
  { key: "kanban", label: "Kanban", icon: Columns3 },
  { key: "list", label: "Liste", icon: List },
  { key: "table", label: "Tableau", icon: Table2 },
  { key: "calendar", label: "Calendrier", icon: CalendarRange },
];

const COLUMNS = [
  { key: "open", label: "Ouvert", accent: "#ef4444" },
  { key: "in_progress", label: "En cours", accent: "#f59e0b" },
  { key: "done", label: "Resolu", accent: "#10b981" },
];

const STATUS_LABEL = {
  open: "Ouvert",
  in_progress: "En cours",
  done: "Resolu",
  resolved: "Resolu",
  closed: "Cloture",
};
const NEXT_STATUS = { open: "in_progress", in_progress: "done" };
const PRIORITY_LABEL = { urgent: "Urgent", high: "Urgent", medium: "Moyen", low: "Bas" };
const PRIORITY_CLASS = { urgent: "chip-rose", high: "chip-rose", medium: "chip-amber", low: "chip-ink" };

const emptyTicket = {
  title: "",
  propertyId: "",
  unitId: "",
  priority: "medium",
  status: "open",
  scheduledDate: "",
  estimatedCost: "",
  currencyId: "",
  description: "",
};

const emptyCost = {
  type: "service",
  description: "",
  amount: "",
  currencyId: "",
  vendorName: "",
  paymentMethod: "cash",
  paymentDate: "",
  notes: "",
};

const statusKey = (status) => (status === "resolved" ? "done" : status || "open");
const isDone = (ticket) => ["done", "resolved", "closed"].includes(statusKey(ticket.status));
const isUrgent = (ticket) => ["urgent", "high"].includes(ticket.priority);
const assigneeName = (ticket) =>
  [ticket.assigneeFirstName, ticket.assigneeLastName].filter(Boolean).join(" ") ||
  ticket.assigneeUsername ||
  ticket.assignee ||
  null;
const ticketDate = (ticket) => ticket.scheduledDate || ticket.createdAt || ticket.updatedAt || "";
const compactDate = (value) => (value ? String(value).slice(0, 10) : "-");

function toId(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function Maintenance() {
  const dateRange = useDateRange();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState(() => {
    try { return localStorage.getItem("domus-maintenance-view") || "kanban"; } catch { return "kanban"; }
  });
  const [ticketModal, setTicketModal] = useState(null);
  const [costModal, setCostModal] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const maintenanceApi = useApi(() => api.maintenance(), []);
  const propertiesApi = useApi(() => api.properties(), []);
  const unitsApi = useApi(() => api.units(), []);
  const currenciesApi = useApi(() => api.currencies(), []);
  const settingApi = useApi(() => api.setting(), []);
  useRealtimeReload(maintenanceApi.reload, ["maintenance"]);

  const loading = maintenanceApi.loading || propertiesApi.loading || unitsApi.loading;
  const error = maintenanceApi.error || propertiesApi.error || unitsApi.error;
  const tickets = useMemo(() => {
    const raw = maintenanceApi.data;
    const list = Array.isArray(raw) ? raw : raw?.data || [];
    return list.map((ticket) => ({ ...ticket, status: statusKey(ticket.status) }));
  }, [maintenanceApi.data]);
  const properties = useMemo(() => (Array.isArray(propertiesApi.data) ? propertiesApi.data : propertiesApi.data?.data || []), [propertiesApi.data]);
  const units = useMemo(() => (Array.isArray(unitsApi.data) ? unitsApi.data : unitsApi.data?.data || []), [unitsApi.data]);
  const currency = useMemo(
    () => normalizeCurrencyModule(currenciesApi.data, settingApi.data),
    [currenciesApi.data, settingApi.data],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (ticketDate(ticket) && !dateRange.inRange(String(ticketDate(ticket)).slice(0, 10))) return false;
      if (filter === "urgent" && !isUrgent(ticket)) return false;
      if (filter === "in_progress" && ticket.status !== "in_progress") return false;
      if (filter === "done" && !isDone(ticket)) return false;
      if (!q) return true;
      return [ticket.title, ticket.description, ticket.propertyName, ticket.unitName, assigneeName(ticket)]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [tickets, query, filter, dateRange]);

  const openTickets = tickets.filter((ticket) => !isDone(ticket));
  const urgentTickets = tickets.filter(isUrgent);
  const inProgressTickets = tickets.filter((ticket) => ticket.status === "in_progress");
  const doneTickets = tickets.filter(isDone);
  const totalCost = tickets.reduce((sum, ticket) => sum + Number(ticket.estimatedCost || 0), 0);

  const filterChips = [
    { key: "all", label: "Tous", count: tickets.length },
    { key: "urgent", label: "Urgent", count: urgentTickets.length },
    { key: "in_progress", label: "En cours", count: inProgressTickets.length },
    { key: "done", label: "Resolus", count: doneTickets.length },
  ];

  const setViewAndStore = (next) => {
    setView(next);
    try { localStorage.setItem("domus-maintenance-view", next); } catch {}
  };

  const reloadAll = async () => {
    await Promise.all([maintenanceApi.reload(), propertiesApi.reload(), unitsApi.reload()]);
  };

  const saveTicket = async (form) => {
    setBusy(true);
    setActionError("");
    try {
      const payload = {
        title: form.title?.trim(),
        propertyId: toId(form.propertyId),
        unitId: toId(form.unitId) ?? null,
        priority: form.priority || "medium",
        status: form.status || "open",
        scheduledDate: form.scheduledDate || null,
        estimatedCost: toMoney(form.estimatedCost),
        currencyId: toId(form.currencyId) ?? null,
        description: form.description?.trim() || null,
      };
      if (!payload.title || !payload.propertyId) throw new Error("Titre et bien obligatoires.");
      if (form.id) await api.updateMaintenance(form.id, payload);
      else await api.createMaintenance(payload);
      setTicketModal(null);
      await reloadAll();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteTicket = async (ticket) => {
    if (!window.confirm(`Supprimer le ticket "${ticket.title}" ?`)) return;
    setBusyId(ticket.id);
    setActionError("");
    try {
      await api.deleteMaintenance(ticket.id);
      await maintenanceApi.reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (ticket, status) => {
    setBusyId(ticket.id);
    setActionError("");
    try {
      await api.updateMaintenance(ticket.id, { status });
      await maintenanceApi.reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusyId(null);
    }
  };

  const advance = (ticket) => {
    const next = NEXT_STATUS[ticket.status];
    if (next) changeStatus(ticket, next);
  };

  const saveCost = async (ticket, form) => {
    setBusy(true);
    setActionError("");
    try {
      const payload = {
        type: form.type || "service",
        description: form.description?.trim(),
        amount: toMoney(form.amount),
        currencyId: toId(form.currencyId) ?? toId(ticket.currencyId) ?? toId(currency.defaultCurrencyId),
        vendorName: form.vendorName?.trim() || undefined,
        paymentMethod: form.paymentMethod || "cash",
        paymentDate: form.paymentDate || undefined,
        notes: form.notes?.trim() || undefined,
      };
      if (!payload.description || !payload.amount) throw new Error("Description et montant obligatoires.");
      await api.addMaintenanceCost(ticket.id, payload);
      setCostModal(null);
      await maintenanceApi.reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} onRetry={reloadAll} />;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>Maintenance</h1>
          <p>Interventions, tickets et couts</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticket, unite, locataire..." />
          </label>
          <button className="immo-btn" onClick={() => setViewAndStore("calendar")}><CalendarDays size={16} /> Planning</button>
          <button className="immo-btn primary" onClick={() => setTicketModal({ ...emptyTicket, currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> Ticket
          </button>
        </div>
      </div>

      <div className="immo-metrics-grid">
        <Metric icon={<Wrench size={20} />} tone="immo-tone-amber" label="Tickets ouverts" value={openTickets.length} />
        <Metric icon={<AlertTriangle size={20} />} tone="immo-tone-red" label="Urgents" value={urgentTickets.length} danger />
        <Metric icon={<Columns3 size={20} />} tone="immo-tone-brand" label="En cours" value={inProgressTickets.length} />
        <Metric icon={<CheckCircle2 size={20} />} tone="immo-tone-green" label="Termines" value={doneTickets.length} success />
      </div>

      <div className="maintenance-toolbar">
        <div className="immo-filter-group">
          {filterChips.map((chip) => (
            <button key={chip.key} type="button" className={filter === chip.key ? "active" : ""} onClick={() => setFilter(chip.key)}>
              {chip.label} <span>{chip.count}</span>
            </button>
          ))}
        </div>
        <div className="immo-view-switch">
          {VIEWS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} type="button" className={view === item.key ? "active" : ""} onClick={() => setViewAndStore(item.key)}>
                <Icon size={15} /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {actionError && <div className="api-error" style={{ marginBottom: 12 }}>{actionError}</div>}

      {view === "kanban" && (
        <KanbanView
          tickets={filtered}
          busyId={busyId}
          menuId={menuId}
          setMenuId={setMenuId}
          onAdvance={advance}
          onStatusChange={changeStatus}
          onEdit={(ticket) => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))}
          onDelete={deleteTicket}
          onCost={(ticket, mode) => setCostModal({ ticket, mode })}
        />
      )}
      {view === "list" && (
        <div className="maintenance-list">
          {filtered.map((ticket, index) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={index}
              busy={busyId === ticket.id}
              menuOpen={menuId === ticket.id}
              onMenu={() => setMenuId(menuId === ticket.id ? null : ticket.id)}
              onAdvance={advance}
              onEdit={() => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))}
              onDelete={() => deleteTicket(ticket)}
              onCost={(mode) => setCostModal({ ticket, mode })}
            />
          ))}
          {filtered.length === 0 && <EmptyMaintenance />}
        </div>
      )}
      {view === "table" && (
        <TableView
          tickets={filtered}
          currencySymbol={currency.defaultCurrencySymbol}
          onEdit={(ticket) => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))}
          onDelete={deleteTicket}
          onCost={(ticket, mode) => setCostModal({ ticket, mode })}
        />
      )}
      {view === "calendar" && <CalendarView tickets={filtered} onOpen={(ticket) => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))} />}

      <div className="card ops-panel maintenance-summary-card">
        <div className="panel-title">Priorites</div>
        <div className="ops-score"><span>Cout estime total</span><b>{money(totalCost, currency.defaultCurrencySymbol)}</b></div>
        <div className="ops-track"><span style={{ width: `${Math.min(100, urgentTickets.length * 20)}%` }} /></div>
        <div className="ops-list">
          {urgentTickets.slice(0, 3).map((ticket, index) => (
            <div key={ticket.id}><b>{index + 1}</b><span>{ticket.title}</span></div>
          ))}
          {urgentTickets.length === 0 && <div><b>0</b><span>Aucun ticket urgent</span></div>}
        </div>
      </div>

      {ticketModal && (
        <TicketModal
          value={ticketModal}
          properties={properties}
          units={units}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          busy={busy}
          error={actionError}
          onClose={() => { setTicketModal(null); setActionError(""); }}
          onSave={saveTicket}
        />
      )}

      {costModal && (
        <CostModal
          ticket={costModal.ticket}
          mode={costModal.mode}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          defaultCurrencySymbol={currency.defaultCurrencySymbol}
          busy={busy}
          error={actionError}
          onClose={() => { setCostModal(null); setActionError(""); }}
          onSave={saveCost}
        />
      )}
    </>
  );
}

function Metric({ icon, tone, label, value, danger, success }) {
  return (
    <div className="immo-metric-card">
      <div className="immo-metric-head"><div className={`immo-metric-icon ${tone}`}>{icon}</div></div>
      <div className="immo-metric-label">{label}</div>
      <div className="immo-metric-value" style={danger ? { color: "#dc2626" } : success ? { color: "#059669" } : undefined}>{value}</div>
    </div>
  );
}

function KanbanView({ tickets, busyId, menuId, setMenuId, onAdvance, onStatusChange, onEdit, onDelete, onCost }) {
  return (
    <div className="maintenance-kanban">
      {COLUMNS.map((column) => {
        const items = tickets.filter((ticket) => statusKey(ticket.status) === column.key);
        return (
          <section className="maintenance-column" key={column.key} style={{ borderTopColor: column.accent }}>
            <div className="maintenance-column-head">
              <span><i style={{ background: column.accent }} /> {column.label}</span>
              <b>{items.length}</b>
            </div>
            <div className="maintenance-column-body">
              {items.map((ticket, index) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  index={index}
                  compact
                  busy={busyId === ticket.id}
                  menuOpen={menuId === ticket.id}
                  onMenu={() => setMenuId(menuId === ticket.id ? null : ticket.id)}
                  onAdvance={onAdvance}
                  onEdit={() => onEdit(ticket)}
                  onDelete={() => onDelete(ticket)}
                  onCost={(mode) => onCost(ticket, mode)}
                  onMove={(status) => onStatusChange(ticket, status)}
                />
              ))}
              {items.length === 0 && <div className="maintenance-empty-col">Aucun ticket</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TicketCard({ ticket, compact = false, busy, menuOpen, onMenu, onAdvance, onEdit, onDelete, onCost, onMove }) {
  const urgent = isUrgent(ticket);
  const done = isDone(ticket);
  const assignee = assigneeName(ticket);
  const next = NEXT_STATUS[ticket.status];
  return (
    <article className={`ticket-card maintenance-ticket ${urgent ? "urgent" : ""} ${done ? "done" : ""}`}>
      <div className="ticket-head">
        <span className={`chip ${PRIORITY_CLASS[ticket.priority] || "chip-amber"}`}>
          {urgent && <AlertTriangle size={12} />} {PRIORITY_LABEL[ticket.priority] || "Moyen"}
        </span>
        <div className="maintenance-card-actions">
          {ticket.projectId && <span className="chip chip-iris"><FolderKanban size={11} /> MNT-{ticket.id}</span>}
          <ActionMenu
            open={menuOpen}
            onToggle={onMenu}
            onEdit={onEdit}
            onDelete={onDelete}
            onCost={onCost}
            onMove={onMove}
          />
        </div>
      </div>
      <h3>{ticket.title}</h3>
      <p>{ticket.propertyName || "-"}{ticket.unitName ? ` - ${ticket.unitName}` : ""}</p>
      {!compact && ticket.description && <p className="maintenance-description">{ticket.description}</p>}
      <div className="ticket-meta">
        <span><User size={14} /> {assignee || "Non assigne"}</span>
        <span><CalendarDays size={14} /> {compactDate(ticketDate(ticket))}</span>
        {Number(ticket.estimatedCost || 0) > 0 && <span><Wrench size={14} /> {money(ticket.estimatedCost)}</span>}
      </div>
      {next && (
        <button className="immo-btn maintenance-next" disabled={busy} onClick={() => onAdvance(ticket)}>
          {busy ? "..." : `Passer a ${STATUS_LABEL[next]}`}
        </button>
      )}
    </article>
  );
}

function ActionMenu({ open, onToggle, onEdit, onDelete, onCost, onMove }) {
  return (
    <span className="maintenance-menu">
      <button type="button" className="maintenance-menu-btn" onClick={(e) => { e.stopPropagation(); onToggle?.(); }} aria-label="Actions du ticket">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="maintenance-menu-pop">
          <button type="button" onClick={() => onCost?.("view")}><Eye size={14} /> Voir les couts</button>
          <button type="button" onClick={() => onCost?.("add")}><CircleDollarSign size={14} /> Enregistrer un cout</button>
          <button type="button" onClick={onEdit}><Pencil size={14} /> Modifier</button>
          {onMove && <button type="button" onClick={() => onMove("open")}>Mettre ouvert</button>}
          {onMove && <button type="button" onClick={() => onMove("in_progress")}>Mettre en cours</button>}
          {onMove && <button type="button" onClick={() => onMove("done")}>Marquer resolu</button>}
          <button type="button" className="danger" onClick={onDelete}><Trash2 size={14} /> Supprimer</button>
        </div>
      )}
    </span>
  );
}

function TableView({ tickets, currencySymbol, onEdit, onDelete, onCost }) {
  if (!tickets.length) return <EmptyMaintenance />;
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="tbl" style={{ width: "100%", minWidth: 860 }}>
        <thead>
          <tr><th>Ticket</th><th>Bien</th><th>Priorite</th><th>Statut</th><th>Assigne</th><th>Date</th><th className="r">Cout</th><th></th></tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td style={{ fontWeight: 700 }}>{ticket.title}</td>
              <td>{ticket.propertyName || "-"}{ticket.unitName ? ` - ${ticket.unitName}` : ""}</td>
              <td><span className={`chip ${PRIORITY_CLASS[ticket.priority] || "chip-amber"}`}>{PRIORITY_LABEL[ticket.priority] || "Moyen"}</span></td>
              <td>{STATUS_LABEL[ticket.status] || ticket.status}</td>
              <td>{assigneeName(ticket) || "Non assigne"}</td>
              <td>{compactDate(ticketDate(ticket))}</td>
              <td className="r">{money(ticket.estimatedCost, currencySymbol)}</td>
              <td className="r">
                <button className="immo-link" onClick={() => onCost(ticket, "view")}>Couts</button>
                <button className="immo-link" onClick={() => onEdit(ticket)}>Modifier</button>
                <button className="immo-link danger" onClick={() => onDelete(ticket)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ tickets, onOpen }) {
  const grouped = tickets.reduce((acc, ticket) => {
    const key = compactDate(ticketDate(ticket));
    if (!acc[key]) acc[key] = [];
    acc[key].push(ticket);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort();
  if (!days.length) return <EmptyMaintenance />;
  return (
    <div className="maintenance-calendar">
      {days.map((day) => (
        <section className="card maintenance-day" key={day}>
          <div className="panel-title"><CalendarDays size={15} /> {day}</div>
          {grouped[day].map((ticket) => (
            <button type="button" key={ticket.id} onClick={() => onOpen(ticket)}>
              <span className={`chip ${PRIORITY_CLASS[ticket.priority] || "chip-amber"}`}>{PRIORITY_LABEL[ticket.priority] || "Moyen"}</span>
              <strong>{ticket.title}</strong>
              <small>{ticket.propertyName || "-"}{ticket.unitName ? ` - ${ticket.unitName}` : ""}</small>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function EmptyMaintenance() {
  return <div className="card maintenance-empty">Aucun ticket a afficher pour ce filtre.</div>;
}

function ticketToForm(ticket, defaultCurrencyId) {
  return {
    id: ticket.id,
    title: ticket.title || "",
    propertyId: ticket.propertyId ? String(ticket.propertyId) : "",
    unitId: ticket.unitId ? String(ticket.unitId) : "",
    priority: ticket.priority || "medium",
    status: ticket.status || "open",
    scheduledDate: ticket.scheduledDate ? String(ticket.scheduledDate).slice(0, 10) : "",
    estimatedCost: ticket.estimatedCost ?? "",
    currencyId: ticket.currencyId || defaultCurrencyId || "",
    description: ticket.description || "",
  };
}

function TicketModal({ value, properties, units, currencyOptions, defaultCurrencyId, busy, error, onClose, onSave }) {
  const [form, setForm] = useState({ ...value, currencyId: value.currencyId || defaultCurrencyId || "" });
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const propertyUnits = units.filter((unit) => !form.propertyId || String(unit.propertyId) === String(form.propertyId));
  return (
    <Modal title={form.id ? "Modifier le ticket" : "Nouveau ticket"} subtitle="Meme flux que le CRM immobilier" icon={<Wrench size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<Wrench size={14} />} title="Intervention">
          <DomusPropertyField label="Titre" value={form.title} onChange={(title) => set({ title })} required placeholder="ex. Fuite cuisine" />
          <div className="domus-property-form-grid">
            <DomusPropertySelect label="Bien" value={form.propertyId} required onChange={(propertyId) => set({ propertyId, unitId: "" })} options={properties.map((p) => [String(p.id), p.name])} />
            <DomusPropertySelect label="Unite" value={form.unitId} onChange={(unitId) => set({ unitId })} options={propertyUnits.map((u) => [String(u.id), `${u.name}${u.propertyName ? ` - ${u.propertyName}` : ""}`])} />
            <DomusPropertySelect label="Priorite" value={form.priority} onChange={(priority) => set({ priority })} options={[["low", "Bas"], ["medium", "Moyen"], ["high", "Urgent"]]} />
            <DomusPropertySelect label="Statut" value={form.status} onChange={(status) => set({ status })} options={[["open", "Ouvert"], ["in_progress", "En cours"], ["done", "Resolu"]]} />
            <DomusPropertyField label="Date prevue" type="date" value={form.scheduledDate} onChange={(scheduledDate) => set({ scheduledDate })} />
            <MoneyField label="Cout estime" value={form.estimatedCost} currencyId={form.currencyId} currencyOptions={currencyOptions} onAmountChange={(estimatedCost) => set({ estimatedCost })} onCurrencyChange={(currencyId) => set({ currencyId })} />
          </div>
          <DomusPropertyField label="Description" value={form.description} onChange={(description) => set({ description })} textarea />
        </FormSection>
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!form.title || !form.propertyId} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

function CostModal({ ticket, mode, currencyOptions, defaultCurrencyId, defaultCurrencySymbol, busy, error, onClose, onSave }) {
  const costsApi = useApi(() => api.maintenanceCosts(ticket.id), [ticket.id]);
  const [form, setForm] = useState({ ...emptyCost, currencyId: ticket.currencyId || defaultCurrencyId || "" });
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const costs = Array.isArray(costsApi.data) ? costsApi.data : costsApi.data?.data || [];
  const total = costs.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
  return (
    <Modal title={`Couts - ${ticket.title}`} subtitle={ticket.propertyName || ""} icon={<CircleDollarSign size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<Eye size={14} />} title="Couts existants">
          {costsApi.loading ? <p className="muted">Chargement...</p> : (
            <div className="maintenance-cost-list">
              {costs.map((cost) => (
                <div key={cost.id}>
                  <strong>{cost.description}</strong>
                  <span>{money(cost.amount, defaultCurrencySymbol)} - {cost.vendorName || cost.type}</span>
                </div>
              ))}
              {costs.length === 0 && <p className="muted">Aucun cout enregistre.</p>}
            </div>
          )}
          <div className="ops-score"><span>Total</span><b>{money(total, defaultCurrencySymbol)}</b></div>
        </FormSection>
        {mode !== "view" && (
          <FormSection icon={<Plus size={14} />} title="Nouveau cout">
            <div className="domus-property-form-grid">
              <DomusPropertySelect label="Type" value={form.type} onChange={(type) => set({ type })} options={[["service", "Service"], ["labour", "Main d'oeuvre"]]} />
              <DomusPropertySelect label="Paiement" value={form.paymentMethod} onChange={(paymentMethod) => set({ paymentMethod })} options={[["cash", "Cash"], ["bank", "Banque"], ["mobile_money", "Mobile money"], ["cheque", "Cheque"]]} />
              <DomusPropertyField label="Fournisseur" value={form.vendorName} onChange={(vendorName) => set({ vendorName })} />
              <DomusPropertyField label="Date paiement" type="date" value={form.paymentDate} onChange={(paymentDate) => set({ paymentDate })} />
              <MoneyField label="Montant" value={form.amount} currencyId={form.currencyId} currencyOptions={currencyOptions} onAmountChange={(amount) => set({ amount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            </div>
            <DomusPropertyField label="Description" value={form.description} onChange={(description) => set({ description })} required />
            <DomusPropertyField label="Notes" value={form.notes} onChange={(notes) => set({ notes })} textarea />
          </FormSection>
        )}
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      {mode === "view" ? (
        <div className="modal-actions"><button className="btn" onClick={onClose}>Fermer</button></div>
      ) : (
        <ModalActions busy={busy} disabled={!form.description || !form.amount} onClose={onClose} onSave={() => onSave(ticket, form)} />
      )}
    </Modal>
  );
}

function MoneyField({ label, value, currencyId, currencyOptions, onAmountChange, onCurrencyChange }) {
  return (
    <label className="domus-property-field">
      <span>{label}</span>
      <div className="domus-money-input">
        <input type="number" value={value ?? ""} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)}>
          {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.symbol || option.label}</option>)}
        </select>
      </div>
    </label>
  );
}
