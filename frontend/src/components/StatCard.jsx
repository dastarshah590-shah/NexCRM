export const StatCard = ({ title, value, hint, icon: Icon }) => (
  <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase text-muted">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      </div>
      {Icon ? (
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#E9F3F1] text-brand">
          <Icon size={18} />
        </span>
      ) : null}
    </div>
    {hint ? <p className="mt-3 text-sm text-muted">{hint}</p> : null}
  </div>
);
