import { describe, expect, it } from "vitest";
import { hasPermission, permissions } from "./permissions.js";

describe("role permissions", () => {
  it("allows org admins to perform every action", () => {
    expect(hasPermission("ORG_ADMIN", permissions.usersWrite)).toBe(true);
    expect(hasPermission("ORG_ADMIN", permissions.invoicesWrite)).toBe(true);
  });

  it("keeps viewers read-only", () => {
    expect(hasPermission("VIEWER", permissions.contactsRead)).toBe(true);
    expect(hasPermission("VIEWER", permissions.contactsWrite)).toBe(false);
  });
});
