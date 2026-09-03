import { useState, useEffect } from "react";
import { Bell, Globe, Shield, Archive, Settings, Save } from "lucide-react";
import { api } from "../api.js";

export function Parametres() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.settings()
      .then(setSettings)
      .catch(() => setSettings(defaultSettings()))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding:40, display:"flex", justifyContent:"center" }}><div className="spinner" /></div>;

  const s = settings || defaultSettings();

  return (
    <div>
      <div className="page-head">
        <h1 className="title">Paramètres</h1>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {error && <div className="api-error" style={{ marginBottom:12 }}>{error}</div>}
      {success && <div style={{ background:"#d1fae5", color:"#065f46", borderRadius:8, padding:"10px 12px", marginBottom:12, fontSize:13 }}>Paramètres enregistres.</div>}

      <div className="settings-section">
        <h3><Bell size={16} /> Notifications</h3>
        <div className="card" style={{ padding:"0 16px" }}>
          <SettingToggle label="Notifications email" sub="Recevoir un email pour les evenements importants" value={s.emailNotifications} onChange={(v) => set("emailNotifications", v)} />
          <SettingToggle label="Rappels de taches" sub="Notification avant l'echeance d'une tache" value={s.taskReminders} onChange={(v) => set("taskReminders", v)} />
          <SettingToggle label="Evenements urgents" sub="Alerte immediate pour les evenements haute importance" value={s.urgentAlerts} onChange={(v) => set("urgentAlerts", v)} />
        </div>
      </div>

      <div className="settings-section">
        <h3><Globe size={16} /> Affichage</h3>
        <div className="card" style={{ padding:"0 16px" }}>
          <SettingSelect label="Fuseau horaire" value={s.timezone || "Africa/Kinshasa"} onChange={(v) => set("timezone", v)}
            options={[["Africa/Kinshasa","Kinshasa (WAT, UTC+1)"],["Europe/Paris","Paris (CET, UTC+1)"],["America/Montreal","Montreal (EST, UTC-5)"]]} />
          <SettingSelect label="Format de date" value={s.dateFormat || "dd/MM/yyyy"} onChange={(v) => set("dateFormat", v)}
            options={[["dd/MM/yyyy","JJ/MM/AAAA"],["MM/dd/yyyy","MM/JJ/AAAA"],["yyyy-MM-dd","AAAA-MM-JJ"]]} />
          <SettingSelect label="Vue par defaut" value={s.defaultView || "activite"} onChange={(v) => set("defaultView", v)}
            options={[["dashboard","Tableau de bord"],["activite","Fil d'activité"],["calendrier","Calendrier"],["taches","Tâches"]]} />
        </div>
      </div>

      <div className="settings-section">
        <h3><Settings size={16} /> Journal</h3>
        <div className="card" style={{ padding:"0 16px" }}>
          <SettingToggle label="Audit automatique" sub="Enregistrer automatiquement toutes les actions" value={s.autoAudit !== false} onChange={(v) => set("autoAudit", v)} />
          <SettingToggle label="Evenements inter-modules" sub="Afficher les evenements de tous les modules" value={s.crossModuleEvents !== false} onChange={(v) => set("crossModuleEvents", v)} />
          <SettingSelect label="Retention des evenements" value={s.retentionDays || "365"} onChange={(v) => set("retentionDays", v)}
            options={[["90","3 mois"],["180","6 mois"],["365","1 an"],["730","2 ans"],["0","Indefiniment"]]} />
        </div>
      </div>

      <div className="settings-section">
        <h3><Archive size={16} /> Donnees</h3>
        <div className="card" style={{ padding:16 }}>
          <p style={{ margin:"0 0 12px", fontSize:13, color:"var(--ink-600)" }}>
            Exportez ou archivez les donnees du journal.
          </p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <a href="/journal/" className="btn" style={{ textDecoration:"none" }}>Exporter mes donnees</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ label, sub, value, onChange }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        {sub && <div className="setting-value">{sub}</div>}
      </div>
      <button className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)}>
        <div className="toggle-thumb" />
      </button>
    </div>
  );
}

function SettingSelect({ label, value, onChange, options }) {
  return (
    <div className="setting-row">
      <div className="setting-label">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ height:34, border:"1px solid var(--border)", borderRadius:7, padding:"0 8px", fontSize:13, background:"#fff", color:"var(--ink-800)", outline:"none" }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function defaultSettings() {
  return {
    emailNotifications: true,
    taskReminders: true,
    urgentAlerts: true,
    timezone: "Africa/Kinshasa",
    dateFormat: "dd/MM/yyyy",
    defaultView: "activite",
    autoAudit: true,
    crossModuleEvents: true,
    retentionDays: "365",
  };
}
