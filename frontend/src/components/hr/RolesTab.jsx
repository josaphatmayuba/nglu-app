import { Checkbox, Input, Modal, Spin, Tooltip } from "antd";
import axios from "axios";
import { Plus, Save, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function extractResource(permName) {
  return permName.replace(/^(create|readAll|read|update|delete)-/, "");
}

function extractAction(permName) {
  const m = permName.match(/^(create|readAll|read|update|delete)-/);
  return m ? m[1] : permName;
}

function groupByResource(allPerms) {
  const groups = {};
  for (const p of allPerms) {
    const res = extractResource(p.name);
    if (!groups[res]) groups[res] = [];
    groups[res].push(p);
  }
  return groups;
}

const ACTION_LABELS = {
  create: "Créer",
  read: "Lire",
  readAll: "Lire tout",
  update: "Modifier",
  delete: "Supprimer",
};

export default function RolesTab() {
  const [roles, setRoles] = useState([]);
  const [allPerms, setAllPerms] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [permsLoading, setPermsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get("/role?query=all"),
      axios.get("/permission?query=all"),
    ]).then(([rolesResp, permsResp]) => {
      const rd = rolesResp.data;
      setRoles(Array.isArray(rd) ? rd : (rd.getAllRole ?? []));
      const pd = permsResp.data;
      setAllPerms(Array.isArray(pd) ? pd : []);
    }).finally(() => setLoading(false));
  }, []);

  function selectRole(role) {
    setSelectedRole(role);
    setSaveDone(false);
    setPermsLoading(true);
    axios.get(`/role-permission?roleId=${role.id}`)
      .then(({ data }) => {
        const names = data.permissions ?? [];
        const ids = new Set(
          allPerms.filter((p) => names.includes(p.name)).map((p) => p.id)
        );
        setCheckedIds(ids);
      })
      .finally(() => setPermsLoading(false));
  }

  function togglePerm(id, checked) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    setSaveDone(false);
  }

  function toggleGroup(perms, checked) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (checked ? next.add(p.id) : next.delete(p.id)));
      return next;
    });
    setSaveDone(false);
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await axios.post("/role-permission", {
        roleId: selectedRole.id,
        permissionId: Array.from(checkedIds),
      });
      setSaveDone(true);
    } finally {
      setSaving(false);
    }
  }

  async function addRole() {
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const { data } = await axios.post("/role", { name: newRoleName.trim() });
      const newRole = data?.data ?? data;
      setRoles((prev) => [newRole, ...prev]);
      setNewRoleName("");
      setAddRoleOpen(false);
    } finally {
      setAddingRole(false);
    }
  }

  const grouped = useMemo(() => groupByResource(allPerms), [allPerms]);
  const resourceKeys = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[480px]">
      {/* Roles sidebar */}
      <div className="w-52 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-ink-700">Rôles ({roles.length})</span>
          <Tooltip title="Nouveau rôle">
            <button
              onClick={() => setAddRoleOpen(true)}
              className="p-1 rounded text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
        <div className="space-y-0.5">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                selectedRole?.id === role.id
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{role.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Permissions panel */}
      <div className="flex-1 bg-white rounded-xl border border-ink-200 p-5 min-w-0">
        {!selectedRole ? (
          <div className="flex items-center justify-center h-full text-ink-400 text-sm py-20">
            Sélectionner un rôle pour gérer ses permissions
          </div>
        ) : permsLoading ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-ink-800">{selectedRole.name}</h3>
                <p className="text-xs text-ink-400 mt-0.5">{checkedIds.size} permission(s) accordée(s)</p>
              </div>
              <button
                onClick={savePermissions}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                  saveDone
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-brand-600 hover:bg-brand-700 text-white"
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Sauvegarde..." : saveDone ? "Sauvegardé ✓" : "Sauvegarder"}
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[55vh] pr-1">
              {resourceKeys.map((resource) => {
                const perms = grouped[resource];
                const allChecked = perms.every((p) => checkedIds.has(p.id));
                const someChecked = perms.some((p) => checkedIds.has(p.id));
                return (
                  <div key={resource} className="border border-ink-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Checkbox
                        indeterminate={someChecked && !allChecked}
                        checked={allChecked}
                        onChange={(e) => toggleGroup(perms, e.target.checked)}
                      />
                      <span className="text-xs font-semibold text-ink-700 capitalize">
                        {resource}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 pl-6">
                      {perms.map((p) => {
                        const action = extractAction(p.name);
                        return (
                          <label key={p.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <Checkbox
                              checked={checkedIds.has(p.id)}
                              onChange={(e) => togglePerm(p.id, e.target.checked)}
                            />
                            <span className="text-xs text-ink-600">
                              {ACTION_LABELS[action] ?? action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Modal
        open={addRoleOpen}
        onCancel={() => { setAddRoleOpen(false); setNewRoleName(""); }}
        onOk={addRole}
        okText="Créer"
        cancelText="Annuler"
        confirmLoading={addingRole}
        title="Nouveau rôle"
        destroyOnClose
      >
        <Input
          className="mt-4"
          placeholder="Nom du rôle"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          onPressEnter={addRole}
        />
      </Modal>
    </div>
  );
}
