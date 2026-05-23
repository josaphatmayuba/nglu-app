import { Modal, Select, Spin, Table } from "antd";
import axios from "axios";
import { BriefcaseBusiness, Download, Filter, LayoutGrid, List, Pencil, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import SalariesPage from "./SalariesPage";

const AVATAR_COLORS = [
  "from-purple-500 to-purple-700",
  "from-brand-500 to-brand-700",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-emerald-700",
  "from-rose-500 to-rose-700",
  "from-sky-500 to-sky-700",
];

const TABS = [
  { key: "employes", label: "Employés" },
  { key: "presences", label: "Présences" },
  { key: "paie", label: "Paie" },
  { key: "conges", label: "Congés" },
  { key: "organigramme", label: "Postes & Départements" },
  { key: "performance", label: "Performance" },
];

function getInitials(user) {
  const first = (user.firstName || "")[0] || "";
  const last = (user.lastName || "")[0] || "";
  return (first + last).toUpperCase() || (user.username || "?")[0].toUpperCase();
}

function getDisplayName(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.username || "—";
}

function PlaceholderPanel({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-ink-200">
      <div className="w-12 h-12 rounded-xl bg-ink-100 flex items-center justify-center mb-4">
        <BriefcaseBusiness className="w-6 h-6 text-ink-400" />
      </div>
      <p className="font-medium text-ink-600">{label}</p>
      <p className="text-sm text-ink-400 mt-1">Fonctionnalité à venir</p>
    </div>
  );
}

function buildTableColumns(onEdit) {
  return [
    {
      title: "Nom",
      render: (_, u) => (
        <span className="font-medium text-ink-800">{getDisplayName(u)}</span>
      ),
    },
    {
      title: "Poste",
      render: (_, u) => u.designation?.name || u.role?.name || "—",
    },
    {
      title: "Département",
      render: (_, u) => u.department?.name || "—",
    },
    {
      title: "Salaire",
      render: (_, u) =>
        u.currentSalary != null
          ? new Intl.NumberFormat("fr-FR").format(u.currentSalary)
          : "—",
    },
    {
      title: "Username",
      dataIndex: "username",
    },
    {
      title: "Statut",
      dataIndex: "status",
      render: (s) =>
        s === "true" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
            Actif
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ink-100 text-ink-500">
            Inactif
          </span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_, u) => (
        <button
          onClick={() => onEdit(u)}
          className="p-1.5 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition"
          title="Modifier"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];
}

function EditStaffModal({ user, designations, departments, onClose, onSaved }) {
  const [form, setForm] = useState({
    designationId: user?.designationId ?? null,
    departmentId: user?.departmentId ?? null,
    status: user?.status ?? "true",
  });
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    axios.patch(`/user/${user.id}`, form)
      .then(() => onSaved())
      .catch(() => setSaving(false));
  }

  return (
    <Modal
      open={!!user}
      onCancel={onClose}
      onOk={handleSave}
      okText="Enregistrer"
      cancelText="Annuler"
      confirmLoading={saving}
      title={`Modifier — ${getDisplayName(user ?? {})}`}
      destroyOnClose
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Poste</label>
          <Select
            className="w-full"
            value={form.designationId}
            allowClear
            placeholder="Aucun poste"
            options={designations.map((d) => ({ value: d.id, label: d.name }))}
            onChange={(v) => setForm((f) => ({ ...f, designationId: v ?? null }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Département</label>
          <Select
            className="w-full"
            value={form.departmentId}
            allowClear
            placeholder="Aucun département"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            onChange={(v) => setForm((f) => ({ ...f, departmentId: v ?? null }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Statut</label>
          <Select
            className="w-full"
            value={form.status}
            options={[
              { value: "true", label: "Actif" },
              { value: "false", label: "Inactif" },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
      </div>
    </Modal>
  );
}

export default function HrPanel() {
  const [activeTab, setActiveTab] = useState("employes");
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

  function loadStaff() {
    setStaffLoading(true);
    axios.get("/hr/staff-overview")
      .then(({ data }) => {
        setStaffList(data.staff ?? []);
        setStaffTotal(data.total ?? 0);
        setDesignations(data.designations ?? []);
        setDepartments(data.departments ?? []);
      })
      .finally(() => setStaffLoading(false));
  }

  useEffect(() => { loadStaff(); }, []);

  const activeCount = staffList.filter((u) => u.status === "true").length;

  const filteredStaff = staffList.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getDisplayName(u).toLowerCase().includes(q) ||
      (u.role?.name || "").toLowerCase().includes(q) ||
      (u.designation?.name || "").toLowerCase().includes(q) ||
      (u.department?.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
            Ressources Humaines
          </h1>
          <p className="text-xs md:text-sm text-ink-500 mt-1">
            Employés, paie, présences, congés et performance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-ink-200 hover:border-ink-300 rounded-lg text-sm text-ink-700 transition">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
          </button>
          <button
            className="p-2 bg-white border border-ink-200 hover:border-ink-300 rounded-lg text-ink-600 transition"
            title="Exporter"
          >
            <Download className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
            <UserPlus className="w-4 h-4" />
            <span>Nouvel employé</span>
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5 hover:border-ink-300 transition">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
            <BriefcaseBusiness className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-xs text-ink-500 font-medium mb-1">Employés actifs</div>
          <div className="text-lg md:text-2xl font-semibold text-ink-900 tracking-tight">
            {staffLoading ? "…" : activeCount}
          </div>
          <div className="mt-2 text-xs text-ink-400">
            Total base : {staffLoading ? "…" : staffTotal || staffList.length}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5 hover:border-ink-300 transition">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-xs text-ink-500 font-medium mb-1">Présents aujourd&apos;hui</div>
          <div className="text-lg md:text-2xl font-semibold text-ink-900 tracking-tight">—</div>
          <div className="mt-2 text-xs text-ink-400">Suivi de présence à venir</div>
        </div>

        <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5 hover:border-ink-300 transition">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-xs text-ink-500 font-medium mb-1">Masse salariale</div>
          <div className="text-lg md:text-xl font-semibold text-ink-900 tracking-tight">Voir Paie</div>
          <div className="mt-2 text-xs text-ink-400">Détail dans l&apos;onglet Paie</div>
        </div>

        <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5 hover:border-ink-300 transition">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-xs text-ink-500 font-medium mb-1">Congés en cours</div>
          <div className="text-lg md:text-2xl font-semibold text-ink-900 tracking-tight">—</div>
          <div className="mt-2 text-xs text-ink-400">Gestion des congés à venir</div>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1 p-1 bg-white border border-ink-200 rounded-lg mb-5 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded whitespace-nowrap transition ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:text-ink-700"
              }`}
            >
              {tab.label}
              {tab.key === "employes" && !staffLoading && (
                <span className="ml-1 text-ink-400">{activeCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "employes" && (
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="Rechercher employé (nom, rôle, username)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="inline-flex p-0.5 bg-ink-100 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-ink-700"
                    : "text-ink-500 hover:text-ink-700"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-white shadow-sm text-ink-700"
                    : "text-ink-500 hover:text-ink-700"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tableau</span>
              </button>
            </div>
          </div>

          {staffLoading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredStaff.map((user, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div
                    key={user.id}
                    className="bg-white rounded-xl border border-ink-200 p-4 hover:border-brand-300 hover:shadow-sm transition"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                      >
                        {getInitials(user)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-ink-900 truncate">
                          {getDisplayName(user)}
                        </h4>
                        <p className="text-xs text-ink-500 truncate">
                          {user.designation?.name || user.role?.name || "Sans poste"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {user.department?.name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">
                              {user.department.name}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              user.status === "true"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-ink-100 text-ink-500"
                            }`}
                          >
                            {user.status === "true" ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition flex-shrink-0"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="pt-3 border-t border-ink-100 flex gap-4">
                      <div>
                        <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-0.5">
                          Username
                        </div>
                        <div className="text-xs font-medium text-ink-900">{user.username}</div>
                      </div>
                      {user.currentSalary != null && (
                        <div>
                          <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-0.5">
                            Salaire
                          </div>
                          <div className="text-xs font-medium text-ink-900">
                            {new Intl.NumberFormat("fr-FR").format(user.currentSalary)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredStaff.length === 0 && (
                <div className="col-span-3 py-12 text-center text-ink-400">
                  Aucun employé trouvé
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
              <Table
                rowKey="id"
                dataSource={filteredStaff}
                columns={buildTableColumns(setEditingUser)}
                loading={staffLoading}
                pagination={{ pageSize: 20 }}
                size="middle"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "presences" && <PlaceholderPanel label="Suivi de présences" />}

      {activeTab === "paie" && <SalariesPage />}

      {activeTab === "conges" && <PlaceholderPanel label="Gestion des congés" />}

      {activeTab === "organigramme" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-ink-200 p-5">
            <h3 className="font-semibold text-ink-800 mb-4">
              Postes{" "}
              <span className="text-ink-400 font-normal text-sm">
                ({designations.length})
              </span>
            </h3>
            {designations.length === 0 ? (
              <p className="text-sm text-ink-400">Aucun poste enregistré</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {designations.map((d) => (
                  <li key={d.id} className="py-2.5 text-sm text-ink-700">
                    {d.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-xl border border-ink-200 p-5">
            <h3 className="font-semibold text-ink-800 mb-4">
              Départements{" "}
              <span className="text-ink-400 font-normal text-sm">
                ({departments.length})
              </span>
            </h3>
            {departments.length === 0 ? (
              <p className="text-sm text-ink-400">Aucun département enregistré</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {departments.map((d) => (
                  <li key={d.id} className="py-2.5 text-sm text-ink-700">
                    {d.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === "performance" && <PlaceholderPanel label="Évaluation des performances" />}

      <EditStaffModal
        user={editingUser}
        designations={designations}
        departments={departments}
        onClose={() => setEditingUser(null)}
        onSaved={() => { setEditingUser(null); loadStaff(); }}
      />
    </div>
  );
}
