// Migration Cockpit — écran principal. Pilote la migration legacy PG -> Drizzle/MySQL.
//
// 3 lots : (1) console read-only état + aperçu source, (2) validation/dry-run,
// (3) commande de RUN (affichée, jamais exécutée — approche hybride).
import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clipboard,
  Database,
  Info,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  Table2,
  XCircle,
} from "lucide-react";
import { api } from "./api.js";
import { LoginScreen, clearToken, useAuthToken } from "./auth.jsx";

const LEVEL_ICON = {
  ok: <CheckCircle2 size={15} className="lv-ok" />,
  info: <Info size={15} className="lv-info" />,
  warn: <AlertTriangle size={15} className="lv-warn" />,
  error: <XCircle size={15} className="lv-error" />,
};

export default function App() {
  const token = useAuthToken();
  if (!token) return <LoginScreen />;
  return <Cockpit />;
}

function Cockpit() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.domains();
      setState({ loading: false, error: null, data });
      setSelected((cur) => cur || data.domains[0]?.key || null);
    } catch (err) {
      setState({ loading: false, error: err.message || String(err), data: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = state.data;
  const current = data?.domains.find((d) => d.key === selected) || null;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-logo sm">
            <Database size={16} color="#fff" />
          </div>
          <div>
            <div className="topbar-title">Migration Cockpit</div>
            <div className="topbar-sub">legacy PostgreSQL → Drizzle / MySQL</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={load} title="Rafraîchir">
            <RefreshCw size={15} /> Rafraîchir
          </button>
          <button className="btn btn-ghost" onClick={clearToken} title="Déconnexion">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {data && !data.exportPresent && (
        <div className="alert alert-warn banner">
          <AlertTriangle size={15} /> Export legacy non monté côté serveur (manifest absent). Les comptages
          source sont indisponibles ; l'état des tables de correspondance reste lisible. Configurez{" "}
          <code>MIGRATION_EXPORT_DIR</code> sur le backend.
        </div>
      )}

      {state.loading && (
        <div className="center muted">
          <Loader2 size={18} className="spin" /> Chargement…
        </div>
      )}
      {state.error && <div className="alert alert-error banner">{state.error}</div>}

      {data && (
        <div className="layout">
          <aside className="sidebar">
            <div className="sidebar-head">Domaines</div>
            {data.domains.map((d) => (
              <button
                key={d.key}
                className={`domain-item ${selected === d.key ? "active" : ""}`}
                onClick={() => setSelected(d.key)}
              >
                {d.status === "done" ? (
                  <CheckCircle2 size={16} className="lv-ok" />
                ) : (
                  <Circle size={16} className="muted" />
                )}
                <div className="domain-text">
                  <div className="domain-label">{d.label}</div>
                  <div className="domain-meta">
                    {d.mappedRows != null ? `${d.mappedRows} mappé(s)` : "non migré"}
                    {d.sourceRows != null ? ` · ${d.sourceRows} source` : ""}
                  </div>
                </div>
              </button>
            ))}
          </aside>

          <main className="content">{current && <DomainPanel domain={current} />}</main>
        </div>
      )}
    </div>
  );
}

function DomainPanel({ domain }) {
  return (
    <>
      <div className="panel-head">
        <h1>{domain.label}</h1>
        <span className={`pill ${domain.status === "done" ? "pill-ok" : "pill-pending"}`}>
          {domain.status === "done" ? "Migré + vérifié" : "À migrer"}
        </span>
      </div>

      <ValidationCard domain={domain} />
      <RunCard domain={domain} />
      <SourceCard domain={domain} />
    </>
  );
}

function ValidationCard({ domain }) {
  const [rep, setRep] = useState({ loading: false, error: null, data: null });

  const run = useCallback(async () => {
    setRep({ loading: true, error: null, data: null });
    try {
      const data = await api.validate(domain.key);
      setRep({ loading: false, error: null, data });
    } catch (err) {
      setRep({ loading: false, error: err.message || String(err), data: null });
    }
  }, [domain.key]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <section className="card section">
      <div className="section-head">
        <h2>Validation / dry-run</h2>
        <button className="btn btn-ghost sm" onClick={run}>
          <RefreshCw size={14} /> Relancer
        </button>
      </div>
      {rep.loading && (
        <div className="muted">
          <Loader2 size={14} className="spin" /> Analyse…
        </div>
      )}
      {rep.error && <div className="alert alert-error">{rep.error}</div>}
      {rep.data && (
        <ul className="checks">
          {rep.data.checks.map((c) => (
            <li key={c.id} className={`check check-${c.level}`}>
              <span className="check-icon">{LEVEL_ICON[c.level]}</span>
              <div>
                <div className="check-label">{c.label}</div>
                <div className="check-detail muted">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RunCard({ domain }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .runCommand(domain.key)
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [domain.key]);

  const copy = () => {
    if (!data?.command) return;
    navigator.clipboard?.writeText(data.command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!data) return null;
  return (
    <section className="card section">
      <div className="section-head">
        <h2>
          <Play size={15} style={{ verticalAlign: "-2px" }} /> Exécution (manuelle)
        </h2>
      </div>
      <p className="muted small">{data.note}</p>
      <div className="cmd">
        <code>{data.command}</code>
        <button className="btn btn-ghost sm" onClick={copy}>
          <Clipboard size={14} /> {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </section>
  );
}

function SourceCard({ domain }) {
  const [table, setTable] = useState(domain.sourceTables[0]);
  const [prev, setPrev] = useState({ loading: false, error: null, data: null });

  useEffect(() => {
    setTable(domain.sourceTables[0]);
  }, [domain.key, domain.sourceTables]);

  useEffect(() => {
    if (!table) return;
    let alive = true;
    setPrev({ loading: true, error: null, data: null });
    api
      .preview(table, 25)
      .then((d) => alive && setPrev({ loading: false, error: null, data: d }))
      .catch((err) => alive && setPrev({ loading: false, error: err.message || String(err), data: null }));
    return () => {
      alive = false;
    };
  }, [table]);

  return (
    <section className="card section">
      <div className="section-head">
        <h2>
          <Table2 size={15} style={{ verticalAlign: "-2px" }} /> Aperçu source
        </h2>
      </div>
      <div className="tabs">
        {domain.sourceTables.map((t) => (
          <button key={t} className={`tab ${table === t ? "active" : ""}`} onClick={() => setTable(t)}>
            {t}
          </button>
        ))}
      </div>
      {prev.loading && (
        <div className="muted">
          <Loader2 size={14} className="spin" /> Lecture du CSV…
        </div>
      )}
      {prev.error && <div className="alert alert-error">{prev.error}</div>}
      {prev.data && (
        <>
          <div className="muted small" style={{ marginBottom: 8 }}>
            {prev.data.rowCount != null ? `${prev.data.rowCount} ligne(s) source` : "comptage inconnu"}
            {prev.data.truncated ? ` · ${prev.data.rows.length} affichée(s)` : ""}
          </div>
          {prev.data.rows.length === 0 ? (
            <div className="muted small">Aucune donnée (export non monté ou table vide).</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {prev.data.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prev.data.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} title={cell}>
                          {cell.length > 60 ? cell.slice(0, 60) + "…" : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
