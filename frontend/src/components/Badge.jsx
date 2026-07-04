const colorMap = {
  LEAD: "bg-blue-50 text-blue-700 border-blue-200",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-slate-100 text-slate-700 border-slate-200",
  NEW_LEAD: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PROPOSAL_SENT: "bg-amber-50 text-amber-700 border-amber-200",
  NEGOTIATION: "bg-orange-50 text-orange-700 border-orange-200",
  WON: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOST: "bg-rose-50 text-rose-700 border-rose-200",
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOW: "bg-slate-50 text-slate-700 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
  DRAFT: "bg-slate-50 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
  INVITED: "bg-amber-50 text-amber-700 border-amber-200",
  SKIPPED: "bg-slate-100 text-slate-700 border-slate-200",
  FAILED: "bg-red-50 text-red-700 border-red-200"
};

export const Badge = ({ value, children }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colorMap[value] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
    {children || value}
  </span>
);
