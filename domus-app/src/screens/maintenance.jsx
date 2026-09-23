import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Columns3,
  Eye,
  FolderKanban,
  Images,
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
import { money, normalizeCurrencyModule, cleanCurrencySymbol, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, DomusPropertySelect, FormSection, Modal, ModalActions } from "./biens.jsx";
import { useConfirm } from "../components/Dialog.jsx";
import { takeMaintenancePrefill } from "./reservationPrefill.js";
import { t, tf } from "../i18n.js";

const VIEWS = [
  { key: "kanban", label: t("Kanban"), icon: Columns3 },
  { key: "list", label: t("Liste"), icon: List },
  { key: "table", label: t("Tableau"), icon: Table2 },
  { key: "calendar", label: t("Calendrier"), icon: CalendarRange },
];

const COLUMNS = [
  { key: "open", label: t("Ouvert"), accent: "#ef4444" },
  { key: "in_progress", label: t("En cours"), accent: "#f59e0b" },
  { key: "done", label: t("Resolu"), accent: "#10b981" },
];

const STATUS_LABEL = {
  open: t("Ouvert"),
  in_progress: t("En cours"),
  done: t("Resolu"),
  resolved: t("Resolu"),
  closed: t("Cloture"),
};
const NEXT_STATUS = { open: "in_progress", in_progress: "done" };
const PRIORITY_LABEL = { urgent: t("Urgent"), high: t("Urgent"), medium: t("Moyen"), low: t("Bas") };
const PRIORITY_CLASS = { urgent: "chip-rose", high: "chip-rose", medium: "chip-amber", low: "chip-ink" };

const PHOTO_TYPES = [
  { key: "before", label: t("Avant") },
  { key: "after", label: t("Apres") },
  { key: "invoice", label: t("Facture/recu") },
];
// Types utilisables au moment de la création : "after" n'a de sens qu'une fois le ticket résolu.
const CREATE_PHOTO_TYPES = PHOTO_TYPES.filter((type) => type.key !== "after");

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
  supplierId: "",
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

// Dépense réelle groupée par devise renvoyée par le backend (SIFA : pas de somme inter-devises).
// Repli : si le backend ne fournit rien mais que spentCost > 0, on utilise la devise du ticket.
function spentEntries(ticket, fallbackSymbol) {
  let raw = ticket?.spentByCurrency;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const list = Array.isArray(raw)
    ? raw.map((e) => ({
        symbol: cleanCurrencySymbol({ currencySymbol: e.symbol }) || fallbackSymbol,
        amount: Number(e.amount || 0),
      }))
    : [];
  const filtered = list.filter((e) => e.amount > 0);
  if (filtered.length) return filtered;
  const spent = Number(ticket?.spentCost || 0);
  return spent > 0 ? [{ symbol: fallbackSymbol, amount: spent }] : [];
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
  const [photosModal, setPhotosModal] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  // Prefill contextuel « Declarer un probleme » depuis la fiche d'un bien.
  useEffect(() => {
    const prefill = takeMaintenancePrefill();
    if (prefill) {
      setTicketModal({ ...emptyTicket, propertyId: prefill.propertyId, unitId: prefill.unitId });
    }
  }, []);

  const confirm = useConfirm();
  const maintenanceApi = useApi(() => api.maintenance(), []);
  const propertiesApi = useApi(() => api.properties(), []);
  const unitsApi = useApi(() => api.units(), []);
  const currenciesApi = useApi(() => api.currencies(), []);
  const settingApi = useApi(() => api.setting(), []);
  const suppliersApi = useApi(() => api.suppliers(), []);
  useRealtimeReload(maintenanceApi.reload, ["maintenance"]);

  // Fournisseurs actifs du référentiel central (options [id, libellé] pour le select)
  const supplierOptions = useMemo(() => {
    const raw = suppliersApi.data;
    const arr = Array.isArray(raw) ? raw : (raw?.getAllSupplier || raw?.data || []);
    return (arr || [])
      .filter((s) => String(s.status) === "true")
      .map((s) => [String(s.id), `${s.name}${s.partyType === "individual" ? " (personne)" : ""}`]);
  }, [suppliersApi.data]);

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

  // Symbole de la devise PROPRE au ticket (SIFA : jamais le défaut global).
  // Résout currencyId -> devise via la table des devises ; repli sur les champs
  // portés par le ticket puis sur la devise par défaut.
  const costSymbol = useCallback((ticket) => {
    const byId = ticket?.currencyId != null ? currency.currencyById?.get(Number(ticket.currencyId)) : null;
    const fromId = byId ? cleanCurrencySymbol(byId) : "";
    return fromId || cleanCurrencySymbol(ticket) || currency.defaultCurrencySymbol;
  }, [currency]);

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
  // Totaux estimé + dépensé GROUPÉS par devise (SIFA : jamais de somme inter-devises).
  const costTotalsByCurrency = useMemo(() => {
    const map = new Map();
    tickets.forEach((ticket) => {
      const sym = costSymbol(ticket);
      const est = map.get(sym) || { symbol: sym, estimated: 0, spent: 0 };
      est.estimated += Number(ticket.estimatedCost || 0);
      map.set(sym, est);
      // Dépense ventilée par devise réelle du coût (peut différer de la devise du ticket).
      spentEntries(ticket, sym).forEach((e) => {
        const cur = map.get(e.symbol) || { symbol: e.symbol, estimated: 0, spent: 0 };
        cur.spent += e.amount;
        map.set(e.symbol, cur);
      });
    });
    return [...map.values()].filter((c) => c.estimated || c.spent);
  }, [tickets, costSymbol]);

  const filterChips = [
    { key: "all", label: t("Tous"), count: tickets.length },
    { key: "urgent", label: t("Urgent"), count: urgentTickets.length },
    { key: "in_progress", label: t("En cours"), count: inProgressTickets.length },
    { key: "done", label: t("Resolus"), count: doneTickets.length },
  ];

  const setViewAndStore = (next) => {
    setView(next);
    try { localStorage.setItem("domus-maintenance-view", next); } catch {}
  };

  const reloadAll = async () => {
    await Promise.all([maintenanceApi.reload(), propertiesApi.reload(), unitsApi.reload()]);
  };

  const saveTicket = async (form, pendingPhotos) => {
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
      if (!payload.title || !payload.propertyId) throw new Error(t("Titre et bien obligatoires."));
      const wasNew = !form.id;
      let ticketId = form.id;
      if (form.id) await api.updateMaintenance(form.id, payload);
      else {
        const created = await api.createMaintenance(payload);
        ticketId = created?.id ?? created?.data?.id;
      }
      // Upload des photos mises en attente pendant la création (avant que le ticket n'existe).
      let uploadError = "";
      if (wasNew && ticketId && pendingPhotos?.length) {
        for (const item of pendingPhotos) {
          try {
            await api.uploadMaintenancePhoto(ticketId, item.file, item.type);
          } catch (err) {
            uploadError = err.message || String(err);
          }
        }
      }
      setTicketModal(null);
      await reloadAll();
      // Le ticket est créé ; une erreur d'upload ne doit pas bloquer/rouvrir le modal.
      if (uploadError) setActionError(tf(t("Ticket créé, mais échec de l'envoi d'une photo : {err}"), { err: uploadError }));
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteTicket = async (ticket) => {
    if (!(await confirm({
      title: t("Supprimer le ticket"),
      message: tf(t("Supprimer le ticket {title} ?"), { title: ticket.title }),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
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

  // Passage à "done" : exige une photo "after" ou un commentaire (ouvre resolveModal) ;
  // les autres transitions passent directement par changeStatus comme avant.
  const requestStatusChange = (ticket, status) => {
    if (status === "done") setResolveModal({ ticket });
    else changeStatus(ticket, status);
  };

  const advance = (ticket) => {
    const next = NEXT_STATUS[ticket.status];
    if (next) requestStatusChange(ticket, next);
  };

  const resolveTicket = async (ticket, { comment, hasPhoto }) => {
    setBusyId(ticket.id);
    setActionError("");
    try {
      const payload = { status: "done" };
      if (comment?.trim()) {
        payload.description = `${ticket.description ? `${ticket.description}\n\n` : ""}${t("[Résolution]")} ${comment.trim()}`;
      }
      await api.updateMaintenance(ticket.id, payload);
      await maintenanceApi.reload();
      setResolveModal(null);
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusyId(null);
    }
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
        supplierId: toId(form.supplierId) ?? undefined,
        vendorName: form.vendorName?.trim() || undefined,
        paymentMethod: form.paymentMethod || "cash",
        paymentDate: form.paymentDate || undefined,
        notes: form.notes?.trim() || undefined,
      };
      if (!payload.description || !payload.amount) throw new Error(t("Description et montant obligatoires."));
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
          <h1>{t("Maintenance")}</h1>
          <p>{t("Interventions, tickets et couts")}</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Ticket, unite, locataire...")} />
          </label>
          <button className="immo-btn" onClick={() => setViewAndStore("calendar")}><CalendarDays size={16} /> {t("Planning")}</button>
          <button className="immo-btn primary" onClick={() => setTicketModal({ ...emptyTicket, currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> {t("Ticket")}
          </button>
        </div>
      </div>

      <div className="immo-metrics-grid">
        <Metric icon={<Wrench size={20} />} tone="immo-tone-amber" label={t("Tickets non resolus")} value={openTickets.length} />
        <Metric icon={<AlertTriangle size={20} />} tone="immo-tone-red" label={t("Urgents")} value={urgentTickets.length} danger />
        <Metric icon={<Columns3 size={20} />} tone="immo-tone-brand" label={t("En cours")} value={inProgressTickets.length} />
        <Metric icon={<CheckCircle2 size={20} />} tone="immo-tone-green" label={t("Termines")} value={doneTickets.length} success />
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
          costSymbol={costSymbol}
          onAdvance={advance}
          onStatusChange={requestStatusChange}
          onEdit={(ticket) => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))}
          onDelete={deleteTicket}
          onCost={(ticket, mode) => setCostModal({ ticket, mode })}
          onPhotos={(ticket) => setPhotosModal({ ticket })}
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
              costSymbol={costSymbol}
              onMenu={() => setMenuId(menuId === ticket.id ? null : ticket.id)}
              onAdvance={advance}
              onEdit={() => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))}
              onDelete={() => deleteTicket(ticket)}
              onCost={(mode) => setCostModal({ ticket, mode })}
              onPhotos={() => setPhotosModal({ ticket })}
            />
          ))}
          {filtered.length === 0 && <EmptyMaintenance />}
        </div>
      )}
      {view === "table" && (
        <TableView
          tickets={filtered}
          currencySymbol={currency.defaultCurrencySymbol}
          costSymbol={costSymbol}
          onEdit={(ticket) => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))}
          onDelete={deleteTicket}
          onCost={(ticket, mode) => setCostModal({ ticket, mode })}
          onPhotos={(ticket) => setPhotosModal({ ticket })}
        />
      )}
      {view === "calendar" && <CalendarView tickets={filtered} onOpen={(ticket) => setTicketModal(ticketToForm(ticket, currency.defaultCurrencyId))} />}

      <div className="card ops-panel maintenance-summary-card">
        <div className="panel-title">{t("Priorites")}</div>
        {costTotalsByCurrency.length === 0
          ? <div className="ops-score"><span>{t("Cout estime total")}</span><b>{money(0, currency.defaultCurrencySymbol)}</b></div>
          : costTotalsByCurrency.map((c) => (
              <div className="ops-score" key={c.symbol}>
                <span>{tf("Couts {sym}", {sym: c.symbol})}</span>
                <b>{money(c.estimated, c.symbol)} {t("estimé")}{c.spent > 0 ? ` · ${money(c.spent, c.symbol)} ${t("dépensé")}` : ""}</b>
              </div>
            ))}
        <div className="ops-track"><span style={{ width: `${Math.min(100, urgentTickets.length * 20)}%` }} /></div>
        <div className="ops-list">
          {urgentTickets.slice(0, 3).map((ticket, index) => (
            <div key={ticket.id}><b>{index + 1}</b><span>{ticket.title}</span></div>
          ))}
          {urgentTickets.length === 0 && <div><b>0</b><span>{t("Aucun ticket urgent")}</span></div>}
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
          supplierOptions={supplierOptions}
          busy={busy}
          error={actionError}
          onClose={() => { setCostModal(null); setActionError(""); }}
          onSave={saveCost}
        />
      )}

      {photosModal && (
        <PhotosModal
          ticket={photosModal.ticket}
          onClose={() => setPhotosModal(null)}
        />
      )}

      {resolveModal && (
        <ResolveModal
          ticket={resolveModal.ticket}
          busy={busyId === resolveModal.ticket.id}
          error={actionError}
          onClose={() => { setResolveModal(null); setActionError(""); }}
          onConfirm={(payload) => resolveTicket(resolveModal.ticket, payload)}
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

function KanbanView({ tickets, busyId, menuId, setMenuId, onAdvance, onStatusChange, onEdit, onDelete, onCost, onPhotos }) {
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
                  onPhotos={() => onPhotos(ticket)}
                />
              ))}
              {items.length === 0 && <div className="maintenance-empty-col">{t("Aucun ticket")}</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TicketCard({ ticket, compact = false, busy, menuOpen, costSymbol, onMenu, onAdvance, onEdit, onDelete, onCost, onMove, onPhotos }) {
  const urgent = isUrgent(ticket);
  const done = isDone(ticket);
  const assignee = assigneeName(ticket);
  const next = NEXT_STATUS[ticket.status];
  const sym = costSymbol ? costSymbol(ticket) : undefined;
  const spent = spentEntries(ticket, sym);
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
            onPhotos={onPhotos}
          />
        </div>
      </div>
      <h3>{ticket.title}</h3>
      <p>{ticket.propertyName || "-"}{ticket.unitName ? ` - ${ticket.unitName}` : ""}</p>
      {!compact && ticket.description && <p className="maintenance-description">{ticket.description}</p>}
      <div className="ticket-meta">
        <span><User size={14} /> {assignee || t("Non assigne")}</span>
        <span><CalendarDays size={14} /> {compactDate(ticketDate(ticket))}</span>
        {Number(ticket.estimatedCost || 0) > 0 && <span><Wrench size={14} /> {money(ticket.estimatedCost, sym)}</span>}
        {spent.map((e) => (
          <span key={e.symbol} title={t("Coût réel déjà dépensé")}><CircleDollarSign size={14} /> {money(e.amount, e.symbol)} {t("dépensé")}</span>
        ))}
      </div>
      {next && (
        <button className="immo-btn maintenance-next" disabled={busy} onClick={() => onAdvance(ticket)}>
          {busy ? "..." : tf(t("Passer a {status}"), {status: STATUS_LABEL[next]})}
        </button>
      )}
    </article>
  );
}

function ActionMenu({ open, onToggle, onEdit, onDelete, onCost, onMove, onPhotos }) {
  return (
    <span className="maintenance-menu">
      <button type="button" className="maintenance-menu-btn" onClick={(e) => { e.stopPropagation(); onToggle?.(); }} aria-label={t("Actions du ticket")}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="maintenance-menu-pop">
          <button type="button" onClick={onPhotos}><Images size={14} /> {t("Photos")}</button>
          <button type="button" onClick={() => onCost?.("view")}><Eye size={14} /> {t("Voir les couts")}</button>
          <button type="button" onClick={() => onCost?.("add")}><CircleDollarSign size={14} /> {t("Enregistrer un cout")}</button>
          <button type="button" onClick={onEdit}><Pencil size={14} /> {t("Modifier")}</button>
          {onMove && <button type="button" onClick={() => onMove("open")}>{t("Mettre ouvert")}</button>}
          {onMove && <button type="button" onClick={() => onMove("in_progress")}>{t("Mettre en cours")}</button>}
          {onMove && <button type="button" onClick={() => onMove("done")}>{t("Marquer resolu")}</button>}
          <button type="button" className="danger" onClick={onDelete}><Trash2 size={14} /> {t("Supprimer")}</button>
        </div>
      )}
    </span>
  );
}

function TableView({ tickets, currencySymbol, costSymbol, onEdit, onDelete, onCost, onPhotos }) {
  if (!tickets.length) return <EmptyMaintenance />;
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="tbl" style={{ width: "100%", minWidth: 860 }}>
        <thead>
          <tr><th>{t("Ticket")}</th><th>{t("Bien")}</th><th>{t("Priorite")}</th><th>{t("Statut")}</th><th>{t("Assigne")}</th><th>{t("Date")}</th><th className="r">{t("Cout estime")}</th><th className="r">{t("Depense")}</th><th></th></tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const sym = costSymbol ? costSymbol(ticket) : currencySymbol;
            const spent = spentEntries(ticket, sym);
            return (
            <tr key={ticket.id}>
              <td style={{ fontWeight: 700 }}>{ticket.title}</td>
              <td>{ticket.propertyName || "-"}{ticket.unitName ? ` - ${ticket.unitName}` : ""}</td>
              <td><span className={`chip ${PRIORITY_CLASS[ticket.priority] || "chip-amber"}`}>{PRIORITY_LABEL[ticket.priority] || "Moyen"}</span></td>
              <td>{STATUS_LABEL[ticket.status] || ticket.status}</td>
              <td>{assigneeName(ticket) || t("Non assigne")}</td>
              <td>{compactDate(ticketDate(ticket))}</td>
              <td className="r">{money(ticket.estimatedCost, sym)}</td>
              <td className="r">{spent.length ? spent.map((e) => <div key={e.symbol}>{money(e.amount, e.symbol)}</div>) : <span className="muted">-</span>}</td>
              <td className="r">
                <button className="immo-link" onClick={() => onCost(ticket, "view")}>{t("Couts")}</button>
                <button className="immo-link" onClick={() => onEdit(ticket)}>{t("Modifier")}</button>
                <button className="immo-link danger" onClick={() => onDelete(ticket)}>{t("Supprimer")}</button>
              </td>
            </tr>
            );
          })}
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
              <span className={`chip ${PRIORITY_CLASS[ticket.priority] || "chip-amber"}`}>{PRIORITY_LABEL[ticket.priority] || t("Moyen")}</span>
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
  return <div className="card maintenance-empty">{t("Aucun ticket a afficher pour ce filtre.")}</div>;
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
  const isEdit = Boolean(form.id);

  // Création : photos choisies mais pas encore uploadées (le ticket n'existe pas encore).
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [pendingType, setPendingType] = useState("before");

  // Édition : upload immédiat, comme dans PhotosModal.
  const photosApi = useApi(() => (isEdit ? api.maintenancePhotos(form.id) : Promise.resolve([])), [isEdit, form.id]);
  const [editType, setEditType] = useState("before");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const existingPhotos = Array.isArray(photosApi.data) ? photosApi.data : photosApi.data?.data || [];

  function addPendingPhoto(file) {
    if (!file) return;
    setPendingPhotos((list) => [...list, { file, type: pendingType, name: file.name }]);
  }
  function removePendingPhoto(index) {
    setPendingPhotos((list) => list.filter((_, i) => i !== index));
  }

  async function uploadEditPhoto(file) {
    if (!file || !form.id) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await api.uploadMaintenancePhoto(form.id, file, editType);
      await photosApi.reload();
    } catch (err) {
      setPhotoError(err.message || String(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Modal title={form.id ? t("Modifier le ticket") : t("Nouveau ticket")} subtitle={t("Meme flux que le CRM immobilier")} icon={<Wrench size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<Wrench size={14} />} title={t("Intervention")}>
          <DomusPropertyField label={t("Titre")} value={form.title} onChange={(title) => set({ title })} required placeholder={t("ex. Fuite cuisine")} />
          <div className="domus-property-form-grid">
            <DomusPropertySelect label={t("Bien")} value={form.propertyId} required onChange={(propertyId) => set({ propertyId, unitId: "" })} options={properties.map((p) => [String(p.id), p.name])} />
            <DomusPropertySelect label={t("Unite")} value={form.unitId} onChange={(unitId) => set({ unitId })} options={propertyUnits.map((u) => [String(u.id), `${u.name}${u.propertyName ? ` - ${u.propertyName}` : ""}`])} />
            <DomusPropertySelect label={t("Priorite")} value={form.priority} onChange={(priority) => set({ priority })} options={[["low", t("Bas")], ["medium", t("Moyen")], ["high", t("Urgent")]]} />
            <DomusPropertySelect label={t("Statut")} value={form.status} onChange={(status) => set({ status })} options={[["open", t("Ouvert")], ["in_progress", t("En cours")], ["done", t("Resolu")]]} />
            <DomusPropertyField label={t("Date prevue")} type="date" value={form.scheduledDate} onChange={(scheduledDate) => set({ scheduledDate })} />
            <MoneyField label={t("Cout estime")} value={form.estimatedCost} currencyId={form.currencyId} currencyOptions={currencyOptions} onAmountChange={(estimatedCost) => set({ estimatedCost })} onCurrencyChange={(currencyId) => set({ currencyId })} />
          </div>
          <DomusPropertyField label={t("Description")} value={form.description} onChange={(description) => set({ description })} textarea />
        </FormSection>

        {!isEdit && (
          <FormSection icon={<Camera size={14} />} title={t("Photos")}>
            <div className="immo-filter-group">
              {CREATE_PHOTO_TYPES.map((type) => (
                <button key={type.key} type="button" className={pendingType === type.key ? "active" : ""} onClick={() => setPendingType(type.key)}>
                  {type.label}
                </button>
              ))}
            </div>
            <div className="domus-photo-strip">
              {pendingPhotos.map((item, index) => (
                <div className="domus-photo-thumb" key={`${item.name}-${index}`}>
                  <img src={URL.createObjectURL(item.file)} alt={item.name} />
                  <button type="button" onClick={() => removePendingPhoto(index)} title={t("Retirer")}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <label className="domus-photo-add">
                <Camera size={16} />
                <span>{t("Ajouter")}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    addPendingPhoto(file);
                  }}
                />
              </label>
            </div>
          </FormSection>
        )}

        {isEdit && (
          <FormSection icon={<Camera size={14} />} title={t("Photos")}>
            <div className="immo-filter-group">
              {CREATE_PHOTO_TYPES.map((type) => (
                <button key={type.key} type="button" className={editType === type.key ? "active" : ""} onClick={() => setEditType(type.key)}>
                  {type.label}
                </button>
              ))}
            </div>
            <div className="domus-photo-strip">
              {existingPhotos
                .filter((photo) => (photo.photoType || "before") === editType)
                .map((photo) => (
                  <div className="domus-photo-thumb" key={photo.id}>
                    <img src={api.maintenancePhotoUrl(photo.id)} alt={photo.originalName || editType} />
                  </div>
                ))}
              <label className="domus-photo-add">
                <Camera size={16} />
                <span>{t("Ajouter")}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={photoBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) uploadEditPhoto(file);
                  }}
                />
              </label>
            </div>
            {photoError && <div className="api-error">{photoError}</div>}
          </FormSection>
        )}
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!form.title || !form.propertyId} onClose={onClose} onSave={() => onSave(form, pendingPhotos)} />
    </Modal>
  );
}

function CostModal({ ticket, mode, currencyOptions, defaultCurrencyId, defaultCurrencySymbol, supplierOptions, busy, error, onClose, onSave }) {
  const costsApi = useApi(() => api.maintenanceCosts(ticket.id), [ticket.id]);
  const [form, setForm] = useState({ ...emptyCost, currencyId: ticket.currencyId || defaultCurrencyId || "" });
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const costs = Array.isArray(costsApi.data) ? costsApi.data : costsApi.data?.data || [];
  // Symbole porté par le coût lui-même (repli sur la devise par défaut).
  const costSym = (cost) => cleanCurrencySymbol(cost) || defaultCurrencySymbol;
  // Total GROUPÉ par devise (SIFA : pas de somme inter-devises).
  const totalsByCur = [...costs.reduce((map, cost) => {
    const sym = costSym(cost);
    map.set(sym, (map.get(sym) || 0) + Number(cost.amount || 0));
    return map;
  }, new Map()).entries()];
  return (
    <Modal title={tf(t("Couts - {title}"), {title: ticket.title})} subtitle={ticket.propertyName || ""} icon={<CircleDollarSign size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<Eye size={14} />} title={t("Couts existants")}>
          {costsApi.loading ? <p className="muted">{t("Chargement...")}</p> : (
            <div className="maintenance-cost-list">
              {costs.map((cost) => (
                <div key={cost.id}>
                  <strong>{cost.description}</strong>
                  <span>{money(cost.amount, costSym(cost))} - {cost.vendorName || cost.type}</span>
                </div>
              ))}
              {costs.length === 0 && <p className="muted">{t("Aucun cout enregistre.")}</p>}
            </div>
          )}
          {totalsByCur.length === 0
            ? <div className="ops-score"><span>{t("Total")}</span><b>{money(0, defaultCurrencySymbol)}</b></div>
            : totalsByCur.map(([sym, amount]) => (
                <div className="ops-score" key={sym}><span>{tf(t("Total {sym}"), {sym})}</span><b>{money(amount, sym)}</b></div>
              ))}
        </FormSection>
        {mode !== "view" && (
          <FormSection icon={<Plus size={14} />} title={t("Nouveau cout")}>
            <div className="domus-property-form-grid">
              <DomusPropertySelect label={t("Type")} value={form.type} onChange={(type) => set({ type })} options={[["service", t("Service")], ["labour", t("Main d'oeuvre")]]} />
              <DomusPropertySelect label={t("Paiement")} value={form.paymentMethod} onChange={(paymentMethod) => set({ paymentMethod })} options={[["cash", t("Cash")], ["bank", t("Banque")], ["mobile_money", t("Mobile money")], ["cheque", t("Cheque")]]} />
              <DomusPropertySelect label={t("Fournisseur")} value={form.supplierId} onChange={(supplierId) => {
                const opt = supplierOptions.find(([id]) => id === supplierId);
                set({ supplierId, vendorName: opt ? opt[1].replace(" (personne)", "") : form.vendorName });
              }} options={[["", t("— Aucun / saisir ci-dessous —")], ...supplierOptions]} />
              <DomusPropertyField label={t("Fournisseur (texte libre)")} value={form.vendorName} onChange={(vendorName) => set({ vendorName })} />
              <DomusPropertyField label={t("Date paiement")} type="date" value={form.paymentDate} onChange={(paymentDate) => set({ paymentDate })} />
              <MoneyField label={t("Montant")} value={form.amount} currencyId={form.currencyId} currencyOptions={currencyOptions} onAmountChange={(amount) => set({ amount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            </div>
            <DomusPropertyField label={t("Description")} value={form.description} onChange={(description) => set({ description })} required />
            <DomusPropertyField label={t("Notes")} value={form.notes} onChange={(notes) => set({ notes })} textarea />
          </FormSection>
        )}
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      {mode === "view" ? (
        <div className="modal-actions"><button className="btn" onClick={onClose}>{t("Fermer")}</button></div>
      ) : (
        <ModalActions busy={busy} disabled={!form.description || !form.amount} onClose={onClose} onSave={() => onSave(ticket, form)} />
      )}
    </Modal>
  );
}

function PhotosModal({ ticket, onClose }) {
  const photosApi = useApi(() => api.maintenancePhotos(ticket.id), [ticket.id]);
  const confirm = useConfirm();
  const [uploadType, setUploadType] = useState(isDone(ticket) ? "after" : "before");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const photos = Array.isArray(photosApi.data) ? photosApi.data : photosApi.data?.data || [];
  const grouped = PHOTO_TYPES.map((type) => ({
    ...type,
    items: photos.filter((photo) => (photo.photoType || "before") === type.key),
  }));

  async function handleUpload(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await api.uploadMaintenancePhoto(ticket.id, file, uploadType);
      await photosApi.reload();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(photoId) {
    if (!(await confirm({
      title: t("Supprimer la photo"),
      message: t("Supprimer cette photo ?"),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteMaintenancePhoto(photoId);
      await photosApi.reload();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={tf(t("Photos - {title}"), { title: ticket.title })}
      subtitle={ticket.propertyName || ""}
      icon={<Images size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Camera size={14} />} title={t("Type de photo")}>
          <div className="immo-filter-group">
            {PHOTO_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                className={uploadType === type.key ? "active" : ""}
                onClick={() => setUploadType(type.key)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </FormSection>

        {photosApi.loading ? <p className="muted">{t("Chargement...")}</p> : (
          grouped.map((group) => (
            <FormSection key={group.key} icon={<Images size={14} />} title={group.label}>
              <div className="domus-photo-strip">
                {group.items.map((photo) => (
                  <div className="domus-photo-thumb" key={photo.id}>
                    <img src={api.maintenancePhotoUrl(photo.id)} alt={photo.originalName || group.label} />
                    <button type="button" onClick={() => handleDelete(photo.id)} disabled={busy} title={t("Supprimer la photo")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {group.key === uploadType && (
                  <label className="domus-photo-add">
                    <Camera size={16} />
                    <span>{t("Ajouter")}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) handleUpload(file);
                      }}
                    />
                  </label>
                )}
                {group.items.length === 0 && group.key !== uploadType && <p className="muted">{t("Aucune photo.")}</p>}
              </div>
            </FormSection>
          ))
        )}

        {error && <div className="api-error">{error}</div>}
      </div>
      <div className="modal-actions"><button className="btn" onClick={onClose}>{t("Fermer")}</button></div>
    </Modal>
  );
}

// Confirmation exigée pour passer un ticket en "Resolu" : au moins une photo "after"
// ou un commentaire de résolution (annexé à la description, pas de colonne dédiée).
function ResolveModal({ ticket, busy, error, onClose, onConfirm }) {
  const photosApi = useApi(() => api.maintenancePhotos(ticket.id), [ticket.id]);
  const [comment, setComment] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const photos = Array.isArray(photosApi.data) ? photosApi.data : photosApi.data?.data || [];
  const afterPhotos = photos.filter((photo) => (photo.photoType || "before") === "after");
  const hasPhoto = afterPhotos.length > 0;
  const hasComment = comment.trim().length > 0;

  async function handleUpload(file) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await api.uploadMaintenancePhoto(ticket.id, file, "after");
      await photosApi.reload();
    } catch (err) {
      setPhotoError(err.message || String(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Modal
      title={t("Marquer comme resolu")}
      subtitle={ticket.title}
      icon={<CheckCircle2 size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Camera size={14} />} title={t("Photo apres travaux")}>
          <div className="domus-photo-strip">
            {afterPhotos.map((photo) => (
              <div className="domus-photo-thumb" key={photo.id}>
                <img src={api.maintenancePhotoUrl(photo.id)} alt={photo.originalName || "after"} />
              </div>
            ))}
            <label className="domus-photo-add">
              <Camera size={16} />
              <span>{t("Ajouter")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={photoBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleUpload(file);
                }}
              />
            </label>
          </div>
          {photoError && <div className="api-error">{photoError}</div>}
        </FormSection>
        <FormSection icon={<Pencil size={14} />} title={t("Ou commentaire de resolution")}>
          <DomusPropertyField
            label={t("Commentaire")}
            value={comment}
            onChange={setComment}
            textarea
            placeholder={t("Obligatoire si aucune photo n'est ajoutee")}
          />
        </FormSection>
        {!hasPhoto && !hasComment && (
          <p className="muted" style={{ margin: "0 24px" }}>
            {t("Ajoutez une photo apres travaux ou un commentaire pour confirmer la resolution.")}
          </p>
        )}
        {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      </div>
      <ModalActions
        busy={busy}
        disabled={!hasPhoto && !hasComment}
        onClose={onClose}
        onSave={() => onConfirm({ comment, hasPhoto })}
      />
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
