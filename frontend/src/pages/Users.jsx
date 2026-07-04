import { useEffect, useMemo, useState } from "react";
import { MailPlus, ShieldCheck } from "lucide-react";
import { api } from "../services/api.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { Field, inputClass } from "../components/Field.jsx";
import { Modal } from "../components/Modal.jsx";
import { canWrite, roles } from "../utils/constants.js";
import { enumLabel, formatDate } from "../utils/formatters.js";
import { useAuth } from "../hooks/useAuth.js";

const blankInvite = {
  name: "",
  email: "",
  role: "SALES_USER",
  password: ""
};

export default function Users() {
  const { user } = useAuth();
  const writable = canWrite(user, "users");
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(blankInvite);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [userResponse, permissionResponse] = await Promise.all([
        api.get("/users"),
        api.get("/users/permissions")
      ]);
      setUsers(userResponse.users);
      setPermissions(permissionResponse.roles);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const invite = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      ...(form.password ? { password: form.password } : {})
    };

    try {
      await api.post("/users", payload);
      setModalOpen(false);
      setForm(blankInvite);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (target, patch) => {
    try {
      await api.put(`/users/${target.id}`, patch);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "User",
        render: (item) => (
          <div>
            <p className="font-medium text-ink">{item.name}</p>
            <p className="text-xs text-muted">{item.email}</p>
          </div>
        )
      },
      {
        key: "role",
        header: "Role",
        render: (item) => writable ? (
          <select className={inputClass} value={item.role} onChange={(event) => updateUser(item, { role: event.target.value })}>
            {roles.map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}
          </select>
        ) : enumLabel(item.role)
      },
      {
        key: "status",
        header: "Status",
        render: (item) => writable ? (
          <select className={inputClass} value={item.status} onChange={(event) => updateUser(item, { status: event.target.value })}>
            {['ACTIVE', 'INACTIVE', 'INVITED'].map((status) => <option key={status} value={status}>{enumLabel(status)}</option>)}
          </select>
        ) : <Badge value={item.status}>{enumLabel(item.status)}</Badge>
      },
      { key: "createdAt", header: "Created", render: (item) => formatDate(item.createdAt) }
    ],
    [writable]
  );

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Team Access</h2>
          <p className="text-sm text-muted">{users.length} users in this workspace</p>
        </div>
        {writable ? <Button onClick={() => setModalOpen(true)}><MailPlus size={17} />Invite user</Button> : null}
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-muted">Loading users...</div> : <DataTable columns={columns} rows={users} />}

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {permissions.map((role) => (
          <div key={role.role} className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="text-brand" size={18} />
              <h3 className="text-sm font-semibold text-ink">{enumLabel(role.role)}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((permission) => <Badge key={permission}>{permission}</Badge>)}
            </div>
          </div>
        ))}
      </section>

      <Modal
        open={modalOpen}
        title="Invite User"
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="invite-form" disabled={saving}>{saving ? "Inviting..." : "Invite"}</Button>
          </div>
        }
      >
        <form id="invite-form" className="grid gap-4" onSubmit={invite}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} required /></Field>
            <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></Field>
            <Field label="Role"><select className={inputClass} value={form.role} onChange={(event) => update("role", event.target.value)}>{roles.map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}</select></Field>
            <Field label="Temporary password"><input className={inputClass} type="password" value={form.password} onChange={(event) => update("password", event.target.value)} minLength={8} /></Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
