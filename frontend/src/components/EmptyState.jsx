export const EmptyState = ({ title, message, action }) => (
  <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    {message ? <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{message}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
);
