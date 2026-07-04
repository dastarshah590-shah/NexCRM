export const generateInvoiceNumber = (count = 0, date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const sequence = String(count + 1).padStart(5, "0");

  return `NEX-${year}${month}-${sequence}`;
};
