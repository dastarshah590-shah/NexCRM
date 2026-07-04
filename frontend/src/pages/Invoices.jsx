import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../services/api.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { Field, inputClass } from "../components/Field.jsx";
import { Modal } from "../components/Modal.jsx";
import { canWrite, invoiceStatuses } from "../utils/constants.js";
import { enumLabel, formatCurrency, formatDate } from "../utils/formatters.js";
import { useAuth } from "../hooks/useAuth.js";

const blankInvoice = {
  contactId: "",
  status: "DRAFT",
  tax: 0,
  discount: 0,
  dueDate: "",
  items: [{ description: "", quantity: 1, unitPrice: 0 }]
};

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const contactName = (contact) => contact ? `${contact.firstName} ${contact.lastName || ""}`.trim() : "-";

const calculateTotals = (items, tax, discount) => {
  const normalized = items.map((item) => ({
    ...item,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    total: Number(item.quantity || 0) * Number(item.unitPrice || 0)
  }));
  const subtotal = normalized.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0));
  return { subtotal, total };
};

const downloadInvoice = (invoice) => {
  const rows = invoice.items.map((item) => `${item.description} | ${item.quantity} x $${item.unitPrice} | $${item.total}`).join("\n");
  const content = `Invoice ${invoice.invoiceNumber}\nStatus: ${invoice.status}\nContact: ${contactName(invoice.contact)}\nDue: ${formatDate(invoice.dueDate)}\n\n${rows}\n\nSubtotal: $${invoice.subtotal}\nTax: $${invoice.tax}\nDiscount: $${invoice.discount}\nTotal: $${invoice.total}`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.invoiceNumber}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function Invoices() {
  const { user } = useAuth();
  const writable = canWrite(user, "invoices");
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankInvoice);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "200" });
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      const [invoiceResponse, contactResponse] = await Promise.all([
        api.get(`/invoices?${params}`),
        api.get("/contacts?limit=200")
      ]);
      setInvoices(invoiceResponse.invoices);
      setContacts(contactResponse.contacts);
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
    setForm(blankInvoice);
    setModalOpen(true);
  };

  const openEdit = (invoice) => {
    setEditing(invoice);
    setForm({
      contactId: invoice.contactId || "",
      status: invoice.status || "DRAFT",
      tax: Number(invoice.tax || 0),
      discount: Number(invoice.discount || 0),
      dueDate: toDateInput(invoice.dueDate),
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0)
      }))
    });
    setModalOpen(true);
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const updateItem = (index, field, value) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
  }));
  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, { description: "", quantity: 1, unitPrice: 0 }] }));
  const removeItem = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));

  const totals = useMemo(() => calculateTotals(form.items, form.tax, form.discount), [form.items, form.tax, form.discount]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      contactId: form.contactId || null,
      dueDate: form.dueDate || null,
      tax: Number(form.tax || 0),
      discount: Number(form.discount || 0),
      items: form.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0)
      }))
    };

    try {
      if (editing) {
        await api.put(`/invoices/${editing.id}`, payload);
      } else {
        await api.post("/invoices", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const send = async (invoice) => {
    try {
      await api.patch(`/invoices/${invoice.id}/send`, {});
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const markPaid = async (invoice) => {
    try {
      await api.patch(`/invoices/${invoice.id}/paid`, {});
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (invoice) => {
    if (!confirm(`Delete invoice ${invoice.invoiceNumber}?`)) {
      return;
    }

    try {
      await api.delete(`/invoices/${invoice.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = useMemo(
    () => [
      { key: "invoiceNumber", header: "Invoice", render: (invoice) => <span className="font-medium">{invoice.invoiceNumber}</span> },
      { key: "contact", header: "Contact", render: (invoice) => contactName(invoice.contact) },
      { key: "status", header: "Status", render: (invoice) => <Badge value={invoice.status}>{enumLabel(invoice.status)}</Badge> },
      { key: "dueDate", header: "Due", render: (invoice) => formatDate(invoice.dueDate) },
      { key: "total", header: "Total", render: (invoice) => <span className="font-semibold">{formatCurrency(invoice.total)}</span> },
      {
        key: "actions",
        header: "Actions",
        render: (invoice) => (
          <div className="flex items-center gap-2">
            {writable ? <Button variant="secondary" size="icon" onClick={() => send(invoice)} aria-label="Send invoice"><Mail size={16} /></Button> : null}
            {writable && invoice.status !== "PAID" ? <Button variant="secondary" size="icon" onClick={() => markPaid(invoice)} aria-label="Mark paid"><CheckCircle2 size={16} /></Button> : null}
            <Button variant="secondary" size="icon" onClick={() => downloadInvoice(invoice)} aria-label="Download invoice"><Download size={16} /></Button>
            {writable ? <Button variant="secondary" size="icon" onClick={() => openEdit(invoice)} aria-label="Edit invoice"><Pencil size={16} /></Button> : null}
            {writable ? <Button variant="ghost" size="icon" onClick={() => remove(invoice)} aria-label="Delete invoice"><Trash2 size={16} /></Button> : null}
          </div>
        )
      }
    ],
    [writable]
  );

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
            <input className={`${inputClass} pl-9`} placeholder="Search invoices" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
          </div>
          <select className={inputClass} value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="">All statuses</option>{invoiceStatuses.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}</select>
          <Button variant="secondary" onClick={load}>Apply</Button>
        </div>
        {writable ? <Button onClick={openCreate}><Plus size={17} />Create invoice</Button> : null}
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-muted">Loading invoices...</div> : <DataTable columns={columns} rows={invoices} />}

      <Modal
        open={modalOpen}
        title={editing ? "Edit Invoice" : "Create Invoice"}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="invoice-form" disabled={saving}>{saving ? "Saving..." : "Save invoice"}</Button>
          </div>
        }
      >
        <form id="invoice-form" className="grid gap-4" onSubmit={save}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Contact"><select className={inputClass} value={form.contactId} onChange={(event) => update("contactId", event.target.value)}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contactName(contact)} {contact.companyName ? `- ${contact.companyName}` : ""}</option>)}</select></Field>
            <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => update("status", event.target.value)}>{invoiceStatuses.map((item) => <option key={item} value={item}>{enumLabel(item)}</option>)}</select></Field>
            <Field label="Due date"><input className={inputClass} type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} /></Field>
          </div>

          <div className="grid gap-3">
            {form.items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_100px_130px_40px]">
                <Field label="Description"><input className={inputClass} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} required /></Field>
                <Field label="Qty"><input className={inputClass} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} /></Field>
                <Field label="Unit price"><input className={inputClass} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} /></Field>
                <div className="flex items-end"><Button variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={form.items.length === 1} aria-label="Remove item"><Trash2 size={16} /></Button></div>
              </div>
            ))}
            <div><Button variant="secondary" onClick={addItem}><Plus size={16} />Add item</Button></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tax"><input className={inputClass} type="number" min="0" step="0.01" value={form.tax} onChange={(event) => update("tax", event.target.value)} /></Field>
            <Field label="Discount"><input className={inputClass} type="number" min="0" step="0.01" value={form.discount} onChange={(event) => update("discount", event.target.value)} /></Field>
          </div>

          <div className="ml-auto w-full max-w-sm rounded-lg border border-line bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="mt-2 flex justify-between"><span>Tax</span><span>{formatCurrency(form.tax)}</span></div>
            <div className="mt-2 flex justify-between"><span>Discount</span><span>{formatCurrency(form.discount)}</span></div>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-semibold"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
