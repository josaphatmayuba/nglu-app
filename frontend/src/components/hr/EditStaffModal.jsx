import { DatePicker, Form, Input, Modal, Select, Spin } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const { Option } = Select;

function Section({ label }) {
  return (
    <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-3 mt-5 border-t border-ink-100 pt-4">
      {label}
    </div>
  );
}

export default function EditStaffModal({ user, designations, departments, onClose, onSaved, mode = "edit", open = true }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const isCreate = mode === "create";
  const isOpen = isCreate ? open : !!user;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      axios.get("/role?query=all"),
      axios.get("/shift?query=all"),
    ]).then(([rolesResp, shiftsResp]) => {
      const rd = rolesResp.data;
      setRoles(Array.isArray(rd) ? rd : (rd.getAllRole ?? []));
      const sd = shiftsResp.data;
      setShifts(Array.isArray(sd) ? sd : []);
    }).finally(() => setLoading(false));

    if (isCreate) {
      form.resetFields();
    } else if (user) {
      form.setFieldsValue({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        username: user.username ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        roleId: user.roleId ?? undefined,
        designationId: user.designationId ?? undefined,
        departmentId: user.departmentId ?? undefined,
        shiftId: user.shiftId ?? undefined,
        employeeId: user.employeeId ?? "",
        bloodGroup: user.bloodGroup ?? "",
        street: user.street ?? "",
        city: user.city ?? "",
        state: user.state ?? "",
        zipCode: user.zipCode ?? "",
        country: user.country ?? "",
        status: user.status ?? "true",
        joinDate: user.joinDate ? dayjs(user.joinDate) : null,
        leaveDate: user.leaveDate ? dayjs(user.leaveDate) : null,
      });
    }
  }, [isOpen, user, form, isCreate]);

  async function handleSave() {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    const payload = {
      ...values,
      joinDate: values.joinDate ? values.joinDate.format("YYYY-MM-DD") : undefined,
      leaveDate: values.leaveDate ? values.leaveDate.format("YYYY-MM-DD") : undefined,
    };

    const request = isCreate
      ? axios.post("/user/register", payload)
      : axios.patch(`/user/${user.id}`, payload);

    request
      .then(() => onSaved())
      .catch(() => setSaving(false))
      .finally(() => setSaving(false));
  }

  const name = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || ""
    : "";

  const modalTitle = isCreate ? "Nouvel employé" : `Modifier — ${name}`;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      onOk={handleSave}
      okText={isCreate ? "Créer" : "Enregistrer"}
      cancelText="Annuler"
      confirmLoading={saving}
      title={modalTitle}
      width={680}
      destroyOnClose
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      ) : (
        <Form form={form} layout="vertical" size="small" className="mt-2">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="firstName" label="Prénom">
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Nom">
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="username"
              label="Username"
              rules={isCreate ? [{ required: true, message: "Requis" }] : []}
            >
              <Input disabled={!isCreate} />
            </Form.Item>
            {isCreate && (
              <Form.Item
                name="password"
                label="Mot de passe"
                rules={[
                  { required: true, message: "Requis" },
                  { min: 12, message: "Min 12 caractères" },
                  { max: 64, message: "Max 64 caractères" },
                  {
                    pattern: /^(?=.*[a-zA-Z])(?=.*\d).+$/,
                    message: "Au moins 1 lettre et 1 chiffre",
                  },
                ]}
              >
                <Input.Password placeholder="Min 12 chars, lettre + chiffre" />
              </Form.Item>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
            {!isCreate && (
              <Form.Item name="phone" label="Téléphone">
                <Input />
              </Form.Item>
            )}
          </div>
          {isCreate && (
            <Form.Item name="phone" label="Téléphone">
              <Input />
            </Form.Item>
          )}

          <Section label="Informations RH" />
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="roleId" label="Rôle">
              <Select placeholder="Sélectionner" allowClear>
                {roles.map((r) => <Option key={r.id} value={r.id}>{r.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="designationId" label="Poste">
              <Select placeholder="Sélectionner" allowClear>
                {designations.map((d) => <Option key={d.id} value={d.id}>{d.name}</Option>)}
              </Select>
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="departmentId" label="Département">
              <Select placeholder="Sélectionner" allowClear>
                {departments.map((d) => <Option key={d.id} value={d.id}>{d.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="shiftId" label="Horaire">
              <Select placeholder="Sélectionner" allowClear>
                {shifts.map((s) => <Option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</Option>)}
              </Select>
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="joinDate" label="Date d'embauche">
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="leaveDate" label="Date de départ">
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="employeeId" label="ID employé">
              <Input />
            </Form.Item>
            <Form.Item name="bloodGroup" label="Groupe sanguin">
              <Input placeholder="ex: O+" />
            </Form.Item>
          </div>
          <Form.Item name="status" label="Statut">
            <Select>
              <Option value="true">Actif</Option>
              <Option value="false">Inactif</Option>
            </Select>
          </Form.Item>

          <Section label="Adresse" />
          <Form.Item name="street" label="Rue">
            <Input />
          </Form.Item>
          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="city" label="Ville">
              <Input />
            </Form.Item>
            <Form.Item name="state" label="Province / État">
              <Input />
            </Form.Item>
            <Form.Item name="zipCode" label="Code postal">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="country" label="Pays">
            <Input />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
