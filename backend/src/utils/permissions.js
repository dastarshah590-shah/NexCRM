export const permissions = {
  contactsRead: "contacts:read",
  contactsWrite: "contacts:write",
  dealsRead: "deals:read",
  dealsWrite: "deals:write",
  tasksRead: "tasks:read",
  tasksWrite: "tasks:write",
  invoicesRead: "invoices:read",
  invoicesWrite: "invoices:write",
  usersRead: "users:read",
  usersWrite: "users:write",
  settingsRead: "settings:read",
  settingsWrite: "settings:write",
  reportsRead: "reports:read"
};

const rolePermissions = {
  SUPER_ADMIN: ["*"],
  ORG_ADMIN: ["*"],
  MANAGER: [
    permissions.contactsRead,
    permissions.contactsWrite,
    permissions.dealsRead,
    permissions.dealsWrite,
    permissions.tasksRead,
    permissions.tasksWrite,
    permissions.invoicesRead,
    permissions.usersRead,
    permissions.reportsRead,
    permissions.settingsRead
  ],
  SALES_USER: [
    permissions.contactsRead,
    permissions.contactsWrite,
    permissions.dealsRead,
    permissions.dealsWrite,
    permissions.tasksRead,
    permissions.tasksWrite,
    permissions.invoicesRead,
    permissions.reportsRead
  ],
  FINANCE_USER: [
    permissions.contactsRead,
    permissions.dealsRead,
    permissions.tasksRead,
    permissions.invoicesRead,
    permissions.invoicesWrite,
    permissions.reportsRead
  ],
  VIEWER: [
    permissions.contactsRead,
    permissions.dealsRead,
    permissions.tasksRead,
    permissions.invoicesRead,
    permissions.usersRead,
    permissions.settingsRead,
    permissions.reportsRead
  ]
};

export const hasPermission = (role, permission) => {
  const granted = rolePermissions[role] || [];
  return granted.includes("*") || granted.includes(permission);
};

export const getRolePermissions = (role) => rolePermissions[role] || [];
