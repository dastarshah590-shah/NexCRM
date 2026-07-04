export const Field = ({ label, children, className = "" }) => (
  <label className={`grid gap-1.5 text-sm font-medium text-ink ${className}`}>
    <span>{label}</span>
    {children}
  </label>
);

export const inputClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";

export const textareaClass =
  "min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
