import { useMemo, useState } from "react";
import { Wrench, Plus, CalendarDays, User, AlertTriangle, CheckCircle2, Clock3, Loader, Search } from "lucide-react";
import { useDateRange } from "../dateRange.jsx";

const TICKETS = [
  { id: 1, title: "Fuite cuisine", unit: "Belvedere - B-204", tenant: "M. Tshisekedi Jean", status: "urgent", owner: "Equipe plomberie", due: "Aujourd'hui", cost: "180 $", at: "2026-06-02" },
  { id: 2, title: "Climatisation bureau", unit: "Tour Horizon - Local 12", tenant: "SARL Atlas", status: "planned", owner: "Technicien froid", due: "5 juin", cost: "320 $", at: "2026-06-05" },
  { id: 3, title: "Peinture couloir", unit: "Kiwele - Bloc A", tenant: "Copropriete", status: "open", owner: "Agent terrain", due: "7 juin", cost: "90 $", at: "2026-05-28" },
  { id: 4, title: "Serrure entree", unit: "Belvedere - Apt 3A", tenant: "Mme Ilunga Grace", status: "done", owner: "Securite", due: "Termine", cost: "45 $", at: "2026-05-15" },
];

const meta = {
  urgent: { label: "Urgent", chip: "chip-rose", icon: AlertTriangle },
  planned: { label: "Planifie", chip: "chip-iris", icon: CalendarDays },
  open: { label: "Ouvert", chip: "chip-amber", icon: Clock3 },
  done: { label: "Termine", chip: "chip-emerald", icon: CheckCircle2 },
};

export function Maintenance() {
  const dateRange = useDateRange();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const inPeriod = useMemo(
    () => TICKETS.filter((t) => dateRange.inRange(t.at)),
    [dateRange],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inPeriod.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (!q) return true;
      return [t.title, t.unit, t.tenant, t.owner].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [filter, query, inPeriod]);

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
          <button className="immo-btn"><CalendarDays size={16} /> Planning</button>
          <button className="immo-btn primary"><Plus size={16} /> Ticket</button>
        </div>
      </div>

      <div className="immo-metrics-grid">
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-amber"><Wrench size={20} /></div></div>
          <div className="immo-metric-label">Tickets ouverts</div><div className="immo-metric-value">{inPeriod.filter((t) => t.status !== "done").length}</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-red"><AlertTriangle size={20} /></div><span className="immo-trend danger">Haute</span></div>
          <div className="immo-metric-label">Urgents</div><div className="immo-metric-value" style={{ color: "#dc2626" }}>{inPeriod.filter((t) => t.status === "urgent").length}</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-brand"><Loader size={20} /></div></div>
          <div className="immo-metric-label">Planifies</div><div className="immo-metric-value">{inPeriod.filter((t) => t.status === "planned").length}</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-green"><CheckCircle2 size={20} /></div></div>
          <div className="immo-metric-label">Termines</div><div className="immo-metric-value" style={{ color: "#059669" }}>{inPeriod.filter((t) => t.status === "done").length}</div>
        </div>
      </div>

      <div className="status-tabs">
        <Tab active={filter === "all"} onClick={() => setFilter("all")}>Tous</Tab>
        <Tab active={filter === "urgent"} onClick={() => setFilter("urgent")}>Urgents</Tab>
        <Tab active={filter === "planned"} onClick={() => setFilter("planned")}>Planifies</Tab>
        <Tab active={filter === "done"} onClick={() => setFilter("done")}>Termines</Tab>
      </div>

      <div className="maintenance-board">
        <section className="card board-col">
          <div className="panel-title">Tickets</div>
          {rows.map((ticket) => {
            const m = meta[ticket.status];
            const Icon = m.icon;
            return (
              <article key={ticket.id} className="ticket-card">
                <div className="ticket-head">
                  <span className={`chip ${m.chip}`}><Icon size={12} /> {m.label}</span>
                  <span className="muted">{ticket.cost}</span>
                </div>
                <h3>{ticket.title}</h3>
                <p>{ticket.unit}</p>
                <div className="ticket-meta">
                  <span><User size={14} /> {ticket.tenant}</span>
                  <span><Wrench size={14} /> {ticket.owner}</span>
                  <span><CalendarDays size={14} /> {ticket.due}</span>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="card ops-panel">
          <div className="panel-title">Priorites</div>
          <div className="ops-score">
            <span>Temps moyen resolution</span>
            <b>2,4 j</b>
          </div>
          <div className="ops-track"><span style={{ width: "68%" }} /></div>
          <div className="ops-list">
            <div><b>1</b><span>Fuite cuisine a isoler avant 17h</span></div>
            <div><b>2</b><span>Confirmer devis climatisation</span></div>
            <div><b>3</b><span>Planifier visite etat des lieux</span></div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Tab({ active, onClick, children }) {
  return <button className={`chip ${active ? "chip-active" : "chip-ink"}`} onClick={onClick}>{children}</button>;
}
