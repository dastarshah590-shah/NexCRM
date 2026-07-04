import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { api } from "../services/api.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { Field, inputClass, textareaClass } from "../components/Field.jsx";
import { canWrite } from "../utils/constants.js";
import { enumLabel, formatDateTime } from "../utils/formatters.js";
import { useAuth } from "../hooks/useAuth.js";

const plans = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"];

export default function Settings() {
  const { user, reload } = useAuth();
  const writable = canWrite(user, "settings");
  const [organization, setOrganization] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [orgResponse, emailResponse] = await Promise.all([
        api.get("/settings/organization"),
        api.get("/settings/email-logs")
      ]);
      setOrganization(orgResponse.organization);
      setEmailLogs(emailResponse.emailLogs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (field, value) => setOrganization((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.put("/settings/organization", {
        name: organization.name,
        industry: organization.industry || null,
        website: organization.website || null,
        phone: organization.phone || null,
        address: organization.address || null,
        plan: organization.plan
      });
      setOrganization(response.organization);
      await reload();
      setSuccess("Settings saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const emailColumns = useMemo(
    () => [
      { key: "recipientEmail", header: "Recipient" },
      { key: "subject", header: "Subject" },
      { key: "templateName", header: "Template", render: (log) => log.templateName || "-" },
      { key: "status", header: "Status", render: (log) => <Badge value={log.status}>{enumLabel(log.status)}</Badge> },
      { key: "createdAt", header: "Created", render: (log) => formatDateTime(log.createdAt) }
    ],
    []
  );

  if (loading) {
    return <div className="text-sm text-muted">Loading settings...</div>;
  }

  return (
    <div className="grid gap-6">
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div> : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Organization Profile</h2>
            <p className="text-sm text-muted">Workspace identity and billing plan</p>
          </div>
          {writable ? <Button type="submit" form="settings-form" disabled={saving}><Save size={17} />{saving ? "Saving..." : "Save"}</Button> : null}
        </div>
        <form id="settings-form" className="grid gap-4" onSubmit={save}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Organization name"><input className={inputClass} value={organization.name || ""} onChange={(event) => update("name", event.target.value)} disabled={!writable} required /></Field>
            <Field label="Industry"><input className={inputClass} value={organization.industry || ""} onChange={(event) => update("industry", event.target.value)} disabled={!writable} /></Field>
            <Field label="Website"><input className={inputClass} value={organization.website || ""} onChange={(event) => update("website", event.target.value)} disabled={!writable} /></Field>
            <Field label="Phone"><input className={inputClass} value={organization.phone || ""} onChange={(event) => update("phone", event.target.value)} disabled={!writable} /></Field>
            <Field label="Plan"><select className={inputClass} value={organization.plan || "FREE"} onChange={(event) => update("plan", event.target.value)} disabled={!writable}>{plans.map((plan) => <option key={plan} value={plan}>{enumLabel(plan)}</option>)}</select></Field>
          </div>
          <Field label="Address"><textarea className={textareaClass} value={organization.address || ""} onChange={(event) => update("address", event.target.value)} disabled={!writable} /></Field>
        </form>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Email Logs</h2>
          <p className="text-sm text-muted">Recent SendGrid and local notification activity</p>
        </div>
        <DataTable columns={emailColumns} rows={emailLogs} empty="No email activity yet" />
      </section>
    </div>
  );
}
