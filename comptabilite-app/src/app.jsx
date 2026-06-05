import React from "react";
import { api } from "./api.js";
import { LoginScreen, useAuthToken } from "./auth.jsx";
import { fallback } from "./data.js";

const routes = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "journal", label: "Journal" },
  { id: "accounts", label: "Comptes" },
  { id: "trial", label: "Balance" },
  { id: "reports", label: "Etats financiers" }
];

const money = (value) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
const rowDate = (value) => String(value || "").slice(0, 10) || "-";

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
    Promise.allSettled([api.transactions(), api.accounts(), api.mainAccounts(), api.trialBalance(), api.balanceSheet(), api.incomeStatement()])
      .then(([transactions, accounts, mainAccounts, trialBalance, balanceSheet, incomeStatement]) => {
        if (!alive) return;
        setData({
          transactions: transactions.value?.getAllTransaction || fallback.transactions,
          accounts: Array.isArray(accounts.value) ? accounts.value : fallback.accounts,
          mainAccounts: Array.isArray(mainAccounts.value) ? mainAccounts.value : fallback.mainAccounts,
          trialBalance: trialBalance.value || fallback.trialBalance,
          balanceSheet: balanceSheet.value || fallback.balanceSheet,
          incomeStatement: incomeStatement.value || fallback.incomeStatement
        });
        setApiStatus([transactions, accounts, trialBalance].some((r) => r.status === "fulfilled") ? "api" : "local");
      })
      .catch(() => setApiStatus("local"));
    return () => { alive = false; };
  }, []);
  React.useEffect(() => load(), [load]);

  async function save(kind, form) {
    setBusy(true);
    setError("");
    try {
      if (kind === "transaction") await api.createTransaction({
        date: new Date(form.date).toISOString(),
        debitId: Number(form.debitId),
        creditId: Number(form.creditId),
        particulars: form.particulars,
        amount: Number(form.amount),
        type: form.type || "transaction",
        relatedId: "0",
        status: "true"
      });
      if (kind === "account") await api.createAccount({ name: form.name, accountId: Number(form.accountId) });
      setModal(null);
      load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const total = data.transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const revenue = Number(data.incomeStatement.totalRevenue || 0);
  const expense = Math.abs(Number(data.incomeStatement.totalExpense || 0));
  const profit = Number(data.incomeStatement.profit || revenue - expense);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/comptabilite/"><span className="brand-icon">CO</span><span><strong>Comptabilite</strong><small>Finance</small></span></a>
        <nav>{routes.map((item) => <button key={item.id} className={route === item.id ? "active" : ""} onClick={() => setRoute(item.id)}>{item.label}</button>)}</nav>
        <a className="crm-link" href="/admin/">Retour CRM</a>
      </aside>
      <main className="content">
        <header className="topbar">
          <div><p>Application comptable</p><h1>{routes.find((r) => r.id === route)?.label}</h1></div>
          <div className="topbar-actions">
            <span className={`source-pill ${apiStatus}`}>{apiStatus === "api" ? "API" : "Local"}</span>
            <button className="primary" disabled={apiStatus !== "api"} onClick={() => setModal({ kind: "transaction" })}>Nouvelle ecriture</button>
          </div>
        </header>
        {error && <div className="inline-error">{error}</div>}
        {route === "dashboard" && <Dashboard revenue={revenue} expense={expense} profit={profit} total={total} transactions={data.transactions} accounts={data.accounts} />}
        {route === "journal" && <Journal transactions={data.transactions} canMutate={apiStatus === "api"} onNew={() => setModal({ kind: "transaction" })} />}
        {route === "accounts" && <Accounts accounts={data.accounts} mainAccounts={data.mainAccounts} canMutate={apiStatus === "api"} onNew={() => setModal({ kind: "account" })} />}
        {route === "trial" && <TrialBalance report={data.trialBalance} />}
        {route === "reports" && <Reports balanceSheet={data.balanceSheet} incomeStatement={data.incomeStatement} />}
      </main>
      {modal && <RecordModal modal={modal} accounts={data.accounts} mainAccounts={data.mainAccounts} busy={busy} error={error} onSave={save} onClose={() => setModal(null)} />}
    </div>
  );
}

function Dashboard({ revenue, expense, profit, total, transactions, accounts }) {
  return (
    <>
      <section className="metrics">
        <Metric label="Revenus" value={money(revenue)} helper="compte de resultat" />
        <Metric label="Depenses" value={money(expense)} helper="charges courantes" />
        <Metric label="Resultat" value={money(profit)} helper="periode active" danger={profit < 0} />
        <Metric label="Journal" value={transactions.length} helper={`${accounts.length} comptes actifs`} />
      </section>
      <section className="dashboard-grid">
        <Journal transactions={transactions.slice(0, 6)} compact />
        <section className="panel">
          <div className="panel-head"><h2>Rapprochement</h2><span>{money(total)}</span></div>
          <div className="bars">
            <Bar label="Revenus" value={revenue} max={Math.max(revenue, expense, 1)} />
            <Bar label="Depenses" value={expense} max={Math.max(revenue, expense, 1)} />
            <Bar label="Resultat" value={Math.abs(profit)} max={Math.max(revenue, expense, 1)} />
          </div>
        </section>
      </section>
    </>
  );
}

function Metric({ label, value, helper, danger }) {
  return <article className={`metric ${danger ? "danger" : ""}`}><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>;
}

function Journal({ transactions, compact = false, canMutate = false, onNew }) {
  return (
    <section className={`panel ${compact ? "" : "wide"}`}>
      <div className="panel-head"><h2>Journal</h2><span>{transactions.length} ecritures</span>{canMutate && <button className="mini-action" onClick={onNew}>Ajouter</button>}</div>
      <div className="table">
        {transactions.map((tx) => (
          <div className="table-row tx" key={tx.id}>
            <strong>{tx.particulars}</strong>
            <span>{rowDate(tx.date)}</span>
            <span>{tx.debit?.name || tx.debitId} vers {tx.credit?.name || tx.creditId}</span>
            <em>{money(tx.amount)}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function Accounts({ accounts, mainAccounts, canMutate, onNew }) {
  return (
    <section className="panel wide">
      <div className="panel-head"><h2>Plan de comptes</h2><span>{accounts.length} sous-comptes</span>{canMutate && <button className="mini-action" onClick={onNew}>Ajouter</button>}</div>
      <div className="account-grid">
        {accounts.map((a) => <article className="account-card" key={a.id}><strong>{a.name}</strong><span>{a.account?.name || "Compte"} - {a.account?.type || ""}</span></article>)}
      </div>
      <div className="main-accounts">{mainAccounts.map((a) => <span key={a.id}>{a.name}</span>)}</div>
    </section>
  );
}

function TrialBalance({ report }) {
  const debits = report.debits?.length ? report.debits : [{ id: "d", subAccount: "Total debit", balance: report.totalDebit }];
  const credits = report.credits?.length ? report.credits : [{ id: "c", subAccount: "Total credit", balance: report.totalCredit }];
  return (
    <section className="panel wide">
      <div className="panel-head"><h2>Balance de verification</h2><span>{report.match ? "Equilibree" : "Ecart a verifier"}</span></div>
      <div className="split">
        <ReportList title="Debits" rows={debits} />
        <ReportList title="Credits" rows={credits.map((r) => ({ ...r, balance: Math.abs(Number(r.balance || 0)) }))} />
      </div>
    </section>
  );
}

function Reports({ balanceSheet, incomeStatement }) {
  return (
    <section className="report-grid">
      <section className="panel">
        <div className="panel-head"><h2>Bilan</h2><span>{balanceSheet.match ? "OK" : "Ecart"}</span></div>
        <ReportLine label="Actifs" value={balanceSheet.totalAsset} />
        <ReportLine label="Passifs" value={balanceSheet.totalLiability} />
        <ReportLine label="Capitaux" value={balanceSheet.totalEquity} />
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Resultat</h2><span>{money(incomeStatement.profit)}</span></div>
        <ReportLine label="Revenus" value={incomeStatement.totalRevenue} />
        <ReportLine label="Depenses" value={Math.abs(Number(incomeStatement.totalExpense || 0))} />
        <ReportLine label="Profit" value={incomeStatement.profit} strong />
      </section>
    </section>
  );
}

function ReportList({ title, rows }) {
  return <div><h3>{title}</h3>{rows.map((r) => <ReportLine key={r.id} label={r.subAccount || r.name || r.account} value={r.balance} />)}</div>;
}

function ReportLine({ label, value, strong }) {
  return <div className={`report-line ${strong ? "strong" : ""}`}><span>{label}</span><b>{money(value)}</b></div>;
}

function Bar({ label, value, max }) {
  return <div className="bar"><div><span>{label}</span><b>{money(value)}</b></div><i><em style={{ width: `${Math.min(100, (Number(value || 0) / max) * 100)}%` }} /></i></div>;
}

function RecordModal({ modal, accounts, mainAccounts, busy, error, onSave, onClose }) {
  const [form, setForm] = React.useState(defaults(modal.kind, accounts, mainAccounts));
  const set = (key, value) => setForm((cur) => ({ ...cur, [key]: value }));
  return (
    <div className="modal-scrim">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(modal.kind, form); }}>
        <div className="modal-head"><h2>{modal.kind === "account" ? "Nouveau compte" : "Nouvelle ecriture"}</h2><button type="button" className="icon-btn" onClick={onClose}>x</button></div>
        <div className="form-grid">
          {modal.kind === "transaction" && (
            <>
              <Field label="Date" type="date" value={form.date} onChange={(v) => set("date", v)} required />
              <Field label="Libelle" value={form.particulars} onChange={(v) => set("particulars", v)} required />
              <Select label="Debit" value={form.debitId} onChange={(v) => set("debitId", v)} rows={accounts} />
              <Select label="Credit" value={form.creditId} onChange={(v) => set("creditId", v)} rows={accounts} />
              <Field label="Montant" type="number" value={form.amount} onChange={(v) => set("amount", v)} required />
              <Field label="Type" value={form.type} onChange={(v) => set("type", v)} />
            </>
          )}
          {modal.kind === "account" && (
            <>
              <Field label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
              <Select label="Compte principal" value={form.accountId} onChange={(v) => set("accountId", v)} rows={mainAccounts} />
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

function Select({ label, value, onChange, rows }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>;
}

function defaults(kind, accounts, mainAccounts) {
  if (kind === "account") return { name: "", accountId: mainAccounts[0]?.id || 1 };
  return {
    date: new Date().toISOString().slice(0, 10),
    particulars: "",
    debitId: accounts[0]?.id || 1,
    creditId: accounts[1]?.id || accounts[0]?.id || 2,
    amount: 0,
    type: "transaction"
  };
}
