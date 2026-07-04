export const toEnum = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value).trim().replace(/[-\s]+/g, "_").toUpperCase();
};

export const compact = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

export const toDate = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return new Date(value);
};

export const toDecimalNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

