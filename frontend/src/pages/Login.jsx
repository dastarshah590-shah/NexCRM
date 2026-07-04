import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "../components/Button.jsx";
import { Field, inputClass } from "../components/Field.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "admin@nexcrm.local", password: "Password123!" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-base font-bold text-white">N</div>
          <div>
            <h1 className="text-xl font-semibold text-ink">NexCRM</h1>
            <p className="text-sm text-muted">Sign in to your workspace</p>
          </div>
        </div>
        {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Email">
            <input className={inputClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required />
          </Field>
          <Button type="submit" disabled={submitting}>
            <LogIn size={17} />
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Need a workspace? <Link className="font-medium text-brand" to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
