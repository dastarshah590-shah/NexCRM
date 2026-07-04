import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "../components/Button.jsx";
import { Field, inputClass } from "../components/Field.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-8">
      <div className="w-full max-w-lg rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-base font-bold text-white">N</div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Create NexCRM Workspace</h1>
            <p className="text-sm text-muted">Start with an organization admin account</p>
          </div>
        </div>
        {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} required />
            </Field>
            <Field label="Company name">
              <input className={inputClass} value={form.organizationName} onChange={(event) => update("organizationName", event.target.value)} required />
            </Field>
          </div>
          <Field label="Email">
            <input className={inputClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" value={form.password} onChange={(event) => update("password", event.target.value)} minLength={8} required />
          </Field>
          <Button type="submit" disabled={submitting}>
            <Building2 size={17} />
            {submitting ? "Creating..." : "Create workspace"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Already have access? <Link className="font-medium text-brand" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
