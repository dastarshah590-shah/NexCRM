import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Handshake, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { Field, inputClass } from "../components/Field.jsx";
import { Modal } from "../components/Modal.jsx";
import { canWrite, dealStages } from "../utils/constants.js";
import { enumLabel, formatCurrency, formatDate } from "../utils/formatters.js";
import { useAuth } from "../hooks/useAuth.js";

const blankDeal = {
  title: "",
  value: 0,
  stage: "NEW_LEAD",
  expectedCloseDate: "",
  contactId: "",
  assignedUserId: ""
};

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const contactName = (contact) => contact ? `${contact.firstName} ${contact.lastName || ""}`.trim() : "No contact";

export default function Deals() {
  const { user } = useAuth();
  const writable = canWrite(user, "deals");
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankDeal);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [dealResponse, contactResponse, userResponse] = await Promise.all([
        api.get("/deals?limit=200"),
        api.get("/contacts?limit=200"),
        api.get("/users")
      ]);
      setDeals(dealResponse.deals);
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

  const grouped = useMemo(() => {
    const map = new Map(dealStages.map((stage) => [stage.key, []]));
    deals.forEach((deal) => map.get(deal.stage)?.push(deal));
    return map;
  }, [deals]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankDeal);
    setModalOpen(true);
  };

  const openEdit = (deal) => {
    setEditing(deal);
    setForm({
      title: deal.title || "",
      value: Number(deal.value || 0),
      stage: deal.stage || "NEW_LEAD",
      expectedCloseDate: toDateInput(deal.expectedCloseDate),
      contactId: deal.contactId || "",
      assignedUserId: deal.assignedUserId || ""
    });
    setModalOpen(true);
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      value: Number(form.value || 0),
      contactId: form.contactId || null,
      assignedUserId: form.assignedUserId || null,
      expectedCloseDate: form.expectedCloseDate || null
    };

    try {
      if (editing) {
        await api.put(`/deals/${editing.id}`, payload);
      } else {
        await api.post("/deals", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (deal) => {
    if (!confirm(`Delete ${deal.title}?`)) {
      return;
    }

    try {
      await api.delete(`/deals/${deal.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDrop = async (stage, event) => {
    event.preventDefault();
    const dealId = event.dataTransfer.getData("text/plain");
    const deal = deals.find((item) => item.id === dealId);

    if (!deal || deal.stage === stage || !writable) {
      return;
    }

    setDeals((current) => current.map((item) => (item.id === dealId ? { ...item, stage } : item)));
    try {
      await api.patch(`/deals/${dealId}/stage`, { stage });
      await load();
    } catch (err) {
      setError(err.message);
      await load();
    }
  };

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Sales Pipeline</h2>
          <p className="text-sm text-muted">{deals.length} deals across {dealStages.length} stages</p>
        </div>
        {writable ? <Button onClick={openCreate}><Plus size={17} />Add deal</Button> : null}
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-muted">Loading deals...</div> : (
        <div className="overflow-x-auto pb-3 scrollbar-thin">
          <div className="grid min-w-[1100px] grid-cols-6 gap-4">
            {dealStages.map((stage) => {
              const columnDeals = grouped.get(stage.key) || [];
              const value = columnDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
              return (
                <div
                  key={stage.key}
                  className="min-h-[520px] rounded-lg border border-line bg-slate-50"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(stage.key, event)}
                >
                  <div className="border-b border-line bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink">{stage.label}</h3>
                      <Badge value={stage.key}>{columnDeals.length}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">{formatCurrency(value)}</p>
                  </div>
                  <div className="grid gap-3 p-3">
                    {columnDeals.map((deal) => (
                      <article
                        key={deal.id}
                        draggable={writable}
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", deal.id)}
                        className="rounded-lg border border-line bg-white p-3 shadow-sm"
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-ink">{deal.title}</h4>
                            <p className="mt-1 text-xs text-muted">{contactName(deal.contact)}</p>
                          </div>
                          <Handshake size={17} className="shrink-0 text-brand" />
                        </div>
                        <p className="text-lg font-semibold text-ink">{formatCurrency(deal.value)}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted"><CalendarDays size={14} />{formatDate(deal.expectedCloseDate)}</div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted">{deal.assignedUser?.name || "Unassigned"}</span>
                          {writable ? (
                            <span className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(deal)} aria-label="Edit deal"><Pencil size={15} /></Button>
                              <Button variant="ghost" size="icon" onClick={() => remove(deal)} aria-label="Delete deal"><Trash2 size={15} /></Button>
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit Deal" : "Add Deal"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="deal-form" disabled={saving}>{saving ? "Saving..." : "Save deal"}</Button>
          </div>
        }
      >
        <form id="deal-form" className="grid gap-4" onSubmit={save}>
          <Field label="Title"><input className={inputClass} value={form.title} onChange={(event) => update("title", event.target.value)} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Value"><input className={inputClass} type="number" min="0" step="0.01" value={form.value} onChange={(event) => update("value", event.target.value)} /></Field>
            <Field label="Expected close"><input className={inputClass} type="date" value={form.expectedCloseDate} onChange={(event) => update("expectedCloseDate", event.target.value)} /></Field>
            <Field label="Stage"><select className={inputClass} value={form.stage} onChange={(event) => update("stage", event.target.value)}>{dealStages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select></Field>
            <Field label="Owner"><select className={inputClass} value={form.assignedUserId} onChange={(event) => update("assignedUserId", event.target.value)}><option value="">Unassigned</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          </div>
          <Field label="Contact"><select className={inputClass} value={form.contactId} onChange={(event) => update("contactId", event.target.value)}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contactName(contact)} {contact.companyName ? `- ${contact.companyName}` : ""}</option>)}</select></Field>
        </form>
      </Modal>
    </div>
  );
}
