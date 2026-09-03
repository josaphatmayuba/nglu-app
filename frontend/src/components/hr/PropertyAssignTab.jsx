import { Input, Select, Spin, Tag, message } from "antd";
import axios from "axios";
import { Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Vue d ensemble Utilisateur x Biens (RBAC par bien, Domus, Phase 2). Affectation
// libre, independante du role et du poste : N IMPORTE QUEL user peut etre limite
// a 1..N biens. Vide = aucune restriction (voit tout). Le role decide des droits,
// le bien le perimetre. Les biens sont charges dynamiquement (DB).
export default function PropertyAssignTab() {
  const [staff, setStaff] = useState([]);
  const [properties, setProperties] = useState([]);
  const [assignments, setAssignments] = useState({}); // userId -> number[]
  const [dirty, setDirty] = useState({}); // userId -> number[] (non sauvegarde)
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get("/hr/staff-overview"),
      axios.get("/property-management/properties"),
      axios.get("/property-management/property-assignments"),
    ])
      .then(([staffResp, propsResp, assignResp]) => {
        setStaff(staffResp.data?.staff ?? []);
        setProperties(Array.isArray(propsResp.data) ? propsResp.data : (propsResp.data?.data ?? []));
        setAssignments(assignResp.data ?? {});
      })
      .catch(() => message.error("Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  const propertyOptions = useMemo(
    () =>
      properties.map((p) => ({
        value: p.id,
        label: p.code ? `${p.name} (${p.code})` : p.name,
      })),
    [properties],
  );

  function currentValue(userId) {
    return dirty[userId] ?? assignments[userId] ?? [];
  }

  function onChange(userId, value) {
    setDirty((prev) => ({ ...prev, [userId]: value }));
  }

  async function save(userId) {
    const propertyIds = currentValue(userId);
    setSavingId(userId);
    try {
      await axios.post(`/property-management/property-assignments/${userId}`, { propertyIds });
      setAssignments((prev) => ({ ...prev, [userId]: propertyIds }));
      setDirty((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      message.success("Affectation enregistrée.");
    } catch {
      message.error("Échec de l'enregistrement.");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((u) => {
      const name = [u.firstName, u.lastName, u.username].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q);
    });
  }, [staff, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink-800">Affectation des biens</h3>
          <p className="text-xs text-ink-400 mt-0.5">
            Périmètre Domus par utilisateur (indépendant du rôle et du poste). Vide = voit tout.
          </p>
        </div>
        <Input
          allowClear
          prefix={<Search className="w-3.5 h-3.5 text-ink-400" />}
          placeholder="Rechercher un employé"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </div>

      <div className="bg-white rounded-xl border border-ink-200 divide-y divide-ink-100">
        {filtered.length === 0 && (
          <div className="text-center text-ink-400 text-sm py-10">Aucun employé.</div>
        )}
        {filtered.map((u) => {
          const value = currentValue(u.id);
          const isDirty = Boolean(dirty[u.id]);
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || `#${u.id}`;
          return (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-48 flex-shrink-0">
                <div className="text-sm text-ink-700 truncate">{name}</div>
                <div className="text-[11px] text-ink-400 truncate">{u.role?.name ?? u.designation?.name ?? ""}</div>
              </div>
              <Select
                mode="multiple"
                allowClear
                size="small"
                className="flex-1 min-w-0"
                placeholder="Tous les biens"
                value={value}
                onChange={(v) => onChange(u.id, v)}
                options={propertyOptions}
                maxTagCount="responsive"
                optionFilterProp="label"
                showSearch
              />
              {value.length === 0 && <Tag color="default">Tout</Tag>}
              <button
                onClick={() => save(u.id)}
                disabled={!isDirty || savingId === u.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition disabled:opacity-40 bg-brand-600 hover:bg-brand-700 text-white"
              >
                <Save className="w-3.5 h-3.5" />
                {savingId === u.id ? "…" : "Enregistrer"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
