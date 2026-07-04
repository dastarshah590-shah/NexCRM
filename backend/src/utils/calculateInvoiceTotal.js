import { toDecimalNumber } from "./normalize.js";

export const calculateInvoiceTotal = (items, tax = 0, discount = 0) => {
  const normalizedItems = items.map((item) => {
    const quantity = toDecimalNumber(item.quantity || 1);
    const unitPrice = toDecimalNumber(item.unitPrice);

    return {
      ...item,
      quantity,
      unitPrice,
      total: Number((quantity * unitPrice).toFixed(2))
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  const normalizedTax = toDecimalNumber(tax);
  const normalizedDiscount = toDecimalNumber(discount);
  const total = Math.max(0, subtotal + normalizedTax - normalizedDiscount);

  return {
    items: normalizedItems,
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(normalizedTax.toFixed(2)),
    discount: Number(normalizedDiscount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};
