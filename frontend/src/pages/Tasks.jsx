import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../services/api.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { Field, inputClass, textareaClass } from "../components/Field.jsx";
import { Modal } from "../components/Modal.jsx";
import { canWrite, priorities, taskStatuses } from "../utils/constants.js";
import { enumLabel, formatDate } from "../utils/formatters.js";
import { useAuth } from "../hooks/useAuth.js";

const blankTask = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "PENDING",
  dueDate: "",
  contactId: "",
  dealId: "",
  assignedUserId: ""
};

const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const contactName = (contact) => contact ? `${contact.firstName} ${contact.lastName || ""}`.trim() : "-";

export default function Tasks() {
  const { user } = useAuth();
  const writable = canWrite(user, "tasks");
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankTask);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "200" });
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      const [taskResponse, contactResponse, dealResponse, userResponse] = await Promise.all([
        api.get(`/tasks?${params}`),
        api.get("/contacts?limit=200"),
        api.get("/deals?limit=200"),
        api.get("/users")
      ]);
      setTasks(taskResponse.tasks);
      setContacts(contactResponse.contacts);
      setDeals(dealResponse.deals);
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
    setForm(blankTask);
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "MEDIUM",
      status: task.status || "PENDING",
      dueDate: toDateTimeInput(task.dueDate),
      contactId: task.contactId || "",
      dealId: task.dealId || "",
      assignedUserId: task.assignedUserId || ""
    });
    setModalOpen(true);
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      dueDate: form.dueDate || null,
      contactId: form.contactId || null,
      dealId: form.dealId || null,
      assignedUserId: form.assignedUserId || null
    };

    try {
      if (editing) {
        await api.put(`/tasks/${editing.id}`, payload);
      } else {
        await api.post("/tasks", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const complete = async (task) => {
    try {
      await api.patch(`/tasks/${task.id}/complete`, {});
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (task) => {
    if (!confirm(`Delete task ${task.title}?`)) {
      return;
    }

    try {
      await api.delete(`/tasks/${task.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "title",
        header: "Task",
        render: (task) => (
          <div>
            <p className="font-medium text-ink">{task.title}</p>
            <p className="text-xs text-muted">{task.deal?.title || contactName(task.contact)}</p>
          </div>
        )
      },
      { key: "priority", header: "Priority", render: (task) => <Badge value={task.priority}>{enumLabel(task.priority)}</Badge> },
      { key: "status", header: "Status", render: (task) => <Badge value={task.status}>{enumLabel(task.status)}</Badge> },
      { key: "dueDate", header: "Due", render: (task) => formatDate(task.dueDate) },
      { key: "assignedUser", header: "Owner", render: (task) => task.assignedUser?.name || "Unassigned" },
      {
        key: "actions",
        header: "Actions",
        render: (task) => (
          <div className="flex items-center gap-2">
            {writable && task.status !== "COMPLETED" ? <Button variant="secondary" size="icon" onClick={() => complete(task)} aria-label="Complete task"><CheckCircle2 size={16} /></Button> : null}
            {writable ? <Button variant="secondary" size="icon" onClick={() => openEdit(task)} aria-label="Edit task"><Pencil size={16} /></Button> : null}
            {writable ? <Button variant="ghost" size="icon" onClick={() => remove(task)} aria-label="Delete task"><Trash2 size={16} /></Button> : null}
          </div>
        )
      }
    ],
    [writable]
  );

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
            <input className={`${inputClass} pl-9`} placeholder="Search tasks" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
          </div>
          <select className={inputClass} value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="">All statuses</option>{taskStatuses.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}</select>
          <select className={inputClass} value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}><option value="">All priorities</option>{priorities.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}</select>
          <Button variant="secondary" onClick={load}>Apply</Button>
        </div>
        {writable ? <Button onClick={openCreate}><Plus size={17} />Add task</Button> : null}
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-muted">Loading tasks...</div> : <DataTable columns={columns} rows={tasks} />}

      <Modal
        open={modalOpen}
        title={editing ? "Edit Task" : "Add Task"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="task-form" disabled={saving}>{saving ? "Saving..." : "Save task"}</Button>
          </div>
        }
      >
        <form id="task-form" className="grid gap-4" onSubmit={save}>
          <Field label="Title"><input className={inputClass} value={form.title} onChange={(event) => update("title", event.target.value)} required /></Field>
          <Field label="Description"><textarea className={textareaClass} value={form.description} onChange={(event) => update("description", event.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(event) => update("priority", event.target.value)}>{priorities.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}</select></Field>
            <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => update("status", event.target.value)}>{taskStatuses.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}</select></Field>
            <Field label="Due date"><input className={inputClass} type="datetime-local" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} /></Field>
            <Field label="Owner"><select className={inputClass} value={form.assignedUserId} onChange={(event) => update("assignedUserId", event.target.value)}><option value="">Unassigned</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Related contact"><select className={inputClass} value={form.contactId} onChange={(event) => update("contactId", event.target.value)}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contactName(contact)}</option>)}</select></Field>
            <Field label="Related deal"><select className={inputClass} value={form.dealId} onChange={(event) => update("dealId", event.target.value)}><option value="">No deal</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title}</option>)}</select></Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
