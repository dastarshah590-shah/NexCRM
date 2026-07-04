export const dealStages = [
  { key: "NEW_LEAD", label: "New Lead" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" }
];

export const roles = [
  { key: "ORG_ADMIN", label: "Organization Admin" },
  { key: "MANAGER", label: "Manager" },
  { key: "SALES_USER", label: "Sales User" },
  { key: "FINANCE_USER", label: "Finance User" },
  { key: "VIEWER", label: "Viewer" }
];

export const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const taskStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];
export const invoiceStatuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];
export const contactStatuses = ["LEAD", "CUSTOMER", "ARCHIVED"];

export const canWrite = (user, area) => {
  if (!user) {
    return false;
  }

  if (["ORG_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return true;
  }

  const map = {
    contacts: ["MANAGER", "SALES_USER"],
    deals: ["MANAGER", "SALES_USER"],
    tasks: ["MANAGER", "SALES_USER"],
    invoices: ["FINANCE_USER"],
    users: [],
    settings: []
  };

  return map[area]?.includes(user.role) || false;
};
