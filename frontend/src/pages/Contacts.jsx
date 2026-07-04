import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { api } from "../services/api.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { Field, inputClass, textareaClass } from "../components/Field.jsx";
import { Modal } from "../components/Modal.jsx";
import { canWrite, contactStatuses } from "../utils/constants.js";
import { enumLabel, formatCurrency, formatDate } from "../utils/formatters.js";
import { useAuth } from "../hooks/useAuth.js";

const blankContact = {
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  source: "",
  status: "LEAD",
  tags: "",
  notes: "",
  assignedUserId: ""
};

const toForm = (contact) => ({
  firstName: contact.firstName || "",
  lastName: contact.lastName || "",
  companyName: contact.companyName || "",
  email: contact.email || "",
  phone: contact.phone || "",
  source: contact.source || "",
  status: contact.status || "LEAD",
  tags: (contact.tags || []).join(", "),
  notes: contact.notes || "",
  assignedUserId: contact.assignedUserId || ""
});

export default function Contacts() {
  const { user } = useAuth();
  const writable = canWrite(user, "contacts");
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankContact);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const [contactResponse, userResponse] = await Promise.all([
        api.get(`/contacts?${params}`),
        api.get("/users")
      ]);
      setContacts(contactResponse.contacts);
      setUsers(userResponse.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blankContact);
    setModalOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm(toForm(contact));
    setModalOpen(true);
  };

  const openDetails = async (contact) => {
    try {
      const response = await api.get(`/contacts/${contact.id}`);
      setSelected(response.contact);
    } catch (err) {
      setError(err.message);
    }
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      assignedUserId: form.assignedUserId || null,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    };

    try {
      if (editing) {
        await api.put(`/contacts/${editing.id}`, payload);
      } else {
        await api.post("/contacts", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (contact) => {
    if (!confirm(`Delete ${contact.firstName} ${contact.lastName || ""}?`)) {
      return;
    }

    try {
      await api.delete(`/contacts/${contact.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Contact",
        render: (contact) => (
          <div>
            <p className="font-medium text-ink">{contact.firstName} {contact.lastName}</p>
            <p className="text-xs text-muted">{contact.email || "No email"}</p>
          </div>
        )
      },
      { key: "companyName", header: "Company", render: (contact) => contact.companyName || "-" },
      { key: "source", header: "Source", render: (contact) => contact.source || "-" },
      { key: "status", header: "Status", render: (contact) => <Badge value={contact.status}>{enumLabel(contact.status)}</Badge> },
      { key: "assignedUser", header: "Owner", render: (contact) => contact.assignedUser?.name || "Unassigned" },
      {
        key: "actions",
        header: "Actions",
        render: (contact) => (
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Button variant="secondary" size="icon" onClick={() => openDetails(contact)} aria-label="View contact"><Eye size={16} /></Button>
            {writable ? <Button variant="secondary" size="icon" onClick={() => openEdit(contact)} aria-label="Edit contact"><Pencil size={16} /></Button> : null}
            {writable ? <Button variant="ghost" size="icon" onClick={() => remove(contact)} aria-label="Delete contact"><Trash2 size={16} /></Button> : null}
          </div>
        )
      }
    ],
    [writable]
  );

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
            <input className={`${inputClass} pl-9`} placeholder="Search contacts" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {contactStatuses.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}
          </select>
          <Button variant="secondary" onClick={load}>Apply</Button>
        </div>
        {writable ? <Button onClick={openCreate}><Plus size={17} />Add contact</Button> : null}
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-muted">Loading contacts...</div> : <DataTable columns={columns} rows={contacts} onRowClick={openDetails} />}

      <Modal
        open={modalOpen}
        title={editing ? "Edit Contact" : "Add Contact"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="contact-form" disabled={saving}>{saving ? "Saving..." : "Save contact"}</Button>
          </div>
        }
      >
        <form id="contact-form" className="grid gap-4" onSubmit={save}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><input className={inputClass} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} required /></Field>
            <Field label="Last name"><input className={inputClass} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></Field>
            <Field label="Company"><input className={inputClass} value={form.companyName} onChange={(event) => update("companyName", event.target.value)} /></Field>
            <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
            <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
            <Field label="Source"><input className={inputClass} value={form.source} onChange={(event) => update("source", event.target.value)} /></Field>
            <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => update("status", event.target.value)}>{contactStatuses.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}</select></Field>
            <Field label="Owner"><select className={inputClass} value={form.assignedUserId} onChange={(event) => update("assignedUserId", event.target.value)}><option value="">Unassigned</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          </div>
          <Field label="Tags"><input className={inputClass} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="premium, referral" /></Field>
          <Field label="Notes"><textarea className={textareaClass} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
        </form>
      </Modal>

      <Modal open={Boolean(selected)} title="Contact Details" onClose={() => setSelected(null)} size="lg">
        {selected ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-lg border border-line p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#E9F3F1] text-brand"><UserPlus size={20} /></div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{selected.firstName} {selected.lastName}</h3>
                  <p className="text-sm text-muted">{selected.companyName || "No company"}</p>
                </div>
              </div>
              <div className="grid gap-2 text-sm">
                <p><span className="text-muted">Email:</span> {selected.email || "-"}</p>
                <p><span className="text-muted">Phone:</span> {selected.phone || "-"}</p>
                <p><span className="text-muted">Source:</span> {selected.source || "-"}</p>
                <p><span className="text-muted">Owner:</span> {selected.assignedUser?.name || "Unassigned"}</p>
              </div>
              {selected.notes ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">{selected.notes}</p> : null}
            </div>
            <div className="grid gap-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-ink">Recent Deals</h4>
                <div className="grid gap-2">{selected.deals.map((deal) => <div key={deal.id} className="flex justify-between rounded-lg border border-line p-3 text-sm"><span>{deal.title}</span><span>{formatCurrency(deal.value)}</span></div>)}</div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-ink">Tasks</h4>
                <div className="grid gap-2">{selected.tasks.map((task) => <div key={task.id} className="flex justify-between rounded-lg border border-line p-3 text-sm"><span>{task.title}</span><span>{formatDate(task.dueDate)}</span></div>)}</div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-ink">Invoices</h4>
                <div className="grid gap-2">{selected.invoices.map((invoice) => <div key={invoice.id} className="flex justify-between rounded-lg border border-line p-3 text-sm"><span>{invoice.invoiceNumber}</span><span>{formatCurrency(invoice.total)}</span></div>)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
