import { describe, expect, it } from "vitest";
import { calculateInvoiceTotal } from "./calculateInvoiceTotal.js";

describe("calculateInvoiceTotal", () => {
  it("calculates subtotal, tax, discount, and total", () => {
    const result = calculateInvoiceTotal(
      [
        { description: "Implementation", quantity: 2, unitPrice: 100 },
        { description: "Support", quantity: 1, unitPrice: 75 }
      ],
      25,
      10
    );

    expect(result.subtotal).toBe(275);
    expect(result.tax).toBe(25);
    expect(result.discount).toBe(10);
    expect(result.total).toBe(290);
    expect(result.items[0].total).toBe(200);
  });
});
