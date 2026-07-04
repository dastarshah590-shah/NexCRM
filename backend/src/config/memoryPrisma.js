import crypto from "crypto";
import bcrypt from "bcryptjs";
import { calculateInvoiceTotal } from "../utils/calculateInvoiceTotal.js";

const collectionByModel = {
  organization: "organizations",
  user: "users",
  contact: "contacts",
  deal: "deals",
  task: "tasks",
  invoice: "invoices",
  invoiceItem: "invoiceItems",
  emailLog: "emailLogs",
  activityLog: "activityLogs"
};

const dateFieldsByModel = {
  organization: ["createdAt", "updatedAt"],
  user: ["resetTokenExpiresAt", "createdAt", "updatedAt"],
  contact: ["createdAt", "updatedAt"],
  deal: ["expectedCloseDate", "wonAt", "lostAt", "createdAt", "updatedAt"],
  task: ["dueDate", "createdAt", "updatedAt"],
  invoice: ["dueDate", "issuedDate", "createdAt", "updatedAt"],
  invoiceItem: ["createdAt"],
  emailLog: ["sentAt", "createdAt"],
  activityLog: ["createdAt"]
};

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const clone = (value) => (value === null || value === undefined ? value : structuredClone(value));

const compareValue = (value) => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (value === null || value === undefined) {
    return null;
  }
  return value;
};

const valuesEqual = (actual, expected) => {
  if (actual instanceof Date || expected instanceof Date) {
    const actualTime = actual instanceof Date ? actual.getTime() : new Date(actual).getTime();
    const expectedTime = expected instanceof Date ? expected.getTime() : new Date(expected).getTime();
    return actualTime === expectedTime;
  }
  return actual === expected;
};

const toDate = (value) => {
  if (!value) {
    return value === null ? null : undefined;
  }
  return value instanceof Date ? value : new Date(value);
};

const dateFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const hasOperator = (condition) =>
  isPlainObject(condition) &&
  ["contains", "not", "in", "lt", "lte", "gt", "gte", "equals"].some((key) =>
    Object.prototype.hasOwnProperty.call(condition, key)
  );

const matchesValue = (actual, condition) => {
  if (!hasOperator(condition)) {
    return valuesEqual(actual, condition);
  }

  if (Object.prototype.hasOwnProperty.call(condition, "equals") && !valuesEqual(actual, condition.equals)) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(condition, "not") && valuesEqual(actual, condition.not)) {
    return false;
  }

  if (condition.in && !condition.in.includes(actual)) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(condition, "contains")) {
    const actualText = String(actual || "");
    const searchText = String(condition.contains || "");
    const insensitive = condition.mode === "insensitive";
    const haystack = insensitive ? actualText.toLowerCase() : actualText;
    const needle = insensitive ? searchText.toLowerCase() : searchText;
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  const actualValue = compareValue(actual);
  const comparesWithNull = actualValue === null || actualValue === undefined;
  if (
    comparesWithNull &&
    (condition.lt !== undefined ||
      condition.lte !== undefined ||
      condition.gt !== undefined ||
      condition.gte !== undefined)
  ) {
    return false;
  }

  if (condition.lt !== undefined && !(actualValue < compareValue(condition.lt))) {
    return false;
  }
  if (condition.lte !== undefined && !(actualValue <= compareValue(condition.lte))) {
    return false;
  }
  if (condition.gt !== undefined && !(actualValue > compareValue(condition.gt))) {
    return false;
  }
  if (condition.gte !== undefined && !(actualValue >= compareValue(condition.gte))) {
    return false;
  }

  return true;
};

const resolveRelation = (model, relation, record, store) => {
  if (!record) {
    return undefined;
  }

  switch (`${model}.${relation}`) {
    case "user.organization":
      return { model: "organization", value: store.organizations.find((item) => item.id === record.organizationId) || null };
    case "contact.assignedUser":
      return { model: "user", value: store.users.find((item) => item.id === record.assignedUserId) || null };
    case "contact.deals":
      return { model: "deal", value: store.deals.filter((item) => item.contactId === record.id) };
    case "contact.tasks":
      return { model: "task", value: store.tasks.filter((item) => item.contactId === record.id) };
    case "contact.invoices":
      return { model: "invoice", value: store.invoices.filter((item) => item.contactId === record.id) };
    case "deal.contact":
      return { model: "contact", value: store.contacts.find((item) => item.id === record.contactId) || null };
    case "deal.assignedUser":
      return { model: "user", value: store.users.find((item) => item.id === record.assignedUserId) || null };
    case "deal.tasks":
      return { model: "task", value: store.tasks.filter((item) => item.dealId === record.id) };
    case "task.assignedUser":
      return { model: "user", value: store.users.find((item) => item.id === record.assignedUserId) || null };
    case "task.contact":
      return { model: "contact", value: store.contacts.find((item) => item.id === record.contactId) || null };
    case "task.deal":
      return { model: "deal", value: store.deals.find((item) => item.id === record.dealId) || null };
    case "invoice.contact":
      return { model: "contact", value: store.contacts.find((item) => item.id === record.contactId) || null };
    case "invoice.items":
      return { model: "invoiceItem", value: store.invoiceItems.filter((item) => item.invoiceId === record.id) };
    case "invoiceItem.invoice":
      return { model: "invoice", value: store.invoices.find((item) => item.id === record.invoiceId) || null };
    case "emailLog.organization":
      return { model: "organization", value: store.organizations.find((item) => item.id === record.organizationId) || null };
    case "activityLog.user":
      return { model: "user", value: store.users.find((item) => item.id === record.userId) || null };
    case "activityLog.organization":
      return { model: "organization", value: store.organizations.find((item) => item.id === record.organizationId) || null };
    default:
      return undefined;
  }
};

const matchesWhere = (record, where, model, store) => {
  if (!where) {
    return true;
  }

  return Object.entries(where).every(([key, condition]) => {
    if (condition === undefined) {
      return true;
    }

    if (key === "OR") {
      return condition.some((item) => matchesWhere(record, item, model, store));
    }

    if (key === "AND") {
      return condition.every((item) => matchesWhere(record, item, model, store));
    }

    const relation = resolveRelation(model, key, record, store);
    if (relation && isPlainObject(condition) && !hasOperator(condition)) {
      if (Array.isArray(relation.value)) {
        return relation.value.some((item) => matchesWhere(item, condition, relation.model, store));
      }
      return relation.value ? matchesWhere(relation.value, condition, relation.model, store) : false;
    }

    return matchesValue(record[key], condition);
  });
};

const sortRecords = (records, orderBy = undefined) => {
  if (!orderBy) {
    return records;
  }

  const orderItems = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...records].sort((left, right) => {
    for (const item of orderItems) {
      const [field, direction] = Object.entries(item)[0];
      const leftValue = compareValue(left[field]);
      const rightValue = compareValue(right[field]);
      const multiplier = direction === "desc" ? -1 : 1;

      if (leftValue === null && rightValue !== null) {
        return 1;
      }
      if (leftValue !== null && rightValue === null) {
        return -1;
      }
      if (leftValue < rightValue) {
        return -1 * multiplier;
      }
      if (leftValue > rightValue) {
        return 1 * multiplier;
      }
    }
    return 0;
  });
};

const applySelect = (record, select = undefined, model, store) => {
  if (!record || !select) {
    return clone(record);
  }

  return Object.entries(select).reduce((result, [key, value]) => {
    if (!value) {
      return result;
    }

    const relation = resolveRelation(model, key, record, store);
    if (relation) {
      if (value === true) {
        result[key] = clone(relation.value);
      } else if (Array.isArray(relation.value)) {
        result[key] = relation.value.map((item) => applySelect(item, value.select, relation.model, store));
      } else {
        result[key] = relation.value ? applySelect(relation.value, value.select, relation.model, store) : null;
      }
      return result;
    }

    result[key] = clone(record[key]);
    return result;
  }, {});
};

const materializeRelated = (relation, spec, store) => {
  if (Array.isArray(relation.value)) {
    let related = sortRecords(relation.value, spec?.orderBy);
    if (Number.isInteger(spec?.take)) {
      related = related.slice(0, spec.take);
    }
    return related.map((item) => materializeRecord(item, relation.model, store, spec));
  }

  if (!relation.value) {
    return null;
  }

  return materializeRecord(relation.value, relation.model, store, spec);
};

const materializeRecord = (record, model, store, args = {}) => {
  if (!record) {
    return null;
  }

  if (args.select) {
    return applySelect(record, args.select, model, store);
  }

  const result = clone(record);
  if (args.include) {
    Object.entries(args.include).forEach(([key, spec]) => {
      const relation = resolveRelation(model, key, record, store);
      if (relation) {
        result[key] = spec === true ? clone(relation.value) : materializeRelated(relation, spec, store);
      }
    });
  }

  return result;
};

const normalizeDates = (model, record) => {
  const fields = dateFieldsByModel[model] || [];
  fields.forEach((field) => {
    if (record[field] !== undefined && record[field] !== null) {
      record[field] = toDate(record[field]);
    }
  });
  return record;
};

const createDefaults = (model, data) => {
  const now = new Date();
  const base = {
    id: data.id || crypto.randomUUID(),
    createdAt: data.createdAt || now
  };

  switch (model) {
    case "organization":
      return { ...base, name: "", plan: "FREE", updatedAt: data.updatedAt || now, ...data };
    case "user":
      return {
        ...base,
        organizationId: null,
        role: "SALES_USER",
        status: "ACTIVE",
        resetToken: null,
        resetTokenExpiresAt: null,
        updatedAt: data.updatedAt || now,
        ...data
      };
    case "contact":
      return {
        ...base,
        assignedUserId: null,
        lastName: null,
        companyName: null,
        email: null,
        phone: null,
        address: null,
        source: null,
        status: "LEAD",
        tags: [],
        notes: null,
        updatedAt: data.updatedAt || now,
        ...data
      };
    case "deal":
      return {
        ...base,
        contactId: null,
        assignedUserId: null,
        value: 0,
        stage: "NEW_LEAD",
        status: "OPEN",
        expectedCloseDate: null,
        wonAt: null,
        lostAt: null,
        updatedAt: data.updatedAt || now,
        ...data
      };
    case "task":
      return {
        ...base,
        contactId: null,
        dealId: null,
        assignedUserId: null,
        description: null,
        priority: "MEDIUM",
        status: "PENDING",
        dueDate: null,
        updatedAt: data.updatedAt || now,
        ...data
      };
    case "invoice":
      return {
        ...base,
        contactId: null,
        status: "DRAFT",
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        dueDate: null,
        issuedDate: data.issuedDate || now,
        updatedAt: data.updatedAt || now,
        ...data
      };
    case "invoiceItem":
      return {
        ...base,
        quantity: 1,
        unitPrice: 0,
        total: 0,
        ...data
      };
    case "emailLog":
      return {
        ...base,
        organizationId: null,
        templateName: null,
        status: "PENDING",
        errorMessage: null,
        sentAt: null,
        ...data
      };
    case "activityLog":
      return {
        ...base,
        userId: null,
        entityType: null,
        entityId: null,
        description: null,
        ...data
      };
    default:
      return { ...base, ...data };
  }
};

const modelError = (model, action) => new Error(`Memory data store could not ${action} ${model}`);

class MemoryDelegate {
  constructor(model, store) {
    this.model = model;
    this.store = store;
  }

  get records() {
    return this.store[collectionByModel[this.model]];
  }

  findRaw(where) {
    return this.records.find((record) => matchesWhere(record, where, this.model, this.store));
  }

  async findUnique(args = {}) {
    const record = this.findRaw(args.where);
    return materializeRecord(record, this.model, this.store, args);
  }

  async findFirst(args = {}) {
    const records = sortRecords(
      this.records.filter((record) => matchesWhere(record, args.where, this.model, this.store)),
      args.orderBy
    );
    return materializeRecord(records[0], this.model, this.store, args);
  }

  async findMany(args = {}) {
    let records = this.records.filter((record) => matchesWhere(record, args.where, this.model, this.store));
    records = sortRecords(records, args.orderBy);
    if (Number.isInteger(args.skip)) {
      records = records.slice(args.skip);
    }
    if (Number.isInteger(args.take)) {
      records = records.slice(0, args.take);
    }
    return records.map((record) => materializeRecord(record, this.model, this.store, args));
  }

  async count(args = {}) {
    return this.records.filter((record) => matchesWhere(record, args.where, this.model, this.store)).length;
  }

  async create(args = {}) {
    const data = clone(args.data || {});
    const nestedItems = data.items?.create;
    delete data.items;

    const record = normalizeDates(this.model, createDefaults(this.model, data));
    this.records.push(record);

    if (this.model === "invoice" && nestedItems) {
      this.createInvoiceItems(record.id, nestedItems);
    }

    return materializeRecord(record, this.model, this.store, args);
  }

  async createMany(args = {}) {
    const items = Array.isArray(args.data) ? args.data : [];
    items.forEach((item) => {
      const record = normalizeDates(this.model, createDefaults(this.model, clone(item)));
      this.records.push(record);
    });
    return { count: items.length };
  }

  async update(args = {}) {
    const record = this.findRaw(args.where);
    if (!record) {
      throw modelError(this.model, "update");
    }

    const data = clone(args.data || {});
    const nestedItems = data.items?.create;
    delete data.items;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        record[key] = value;
      }
    });

    if ("updatedAt" in record) {
      record.updatedAt = new Date();
    }

    normalizeDates(this.model, record);

    if (this.model === "invoice" && nestedItems) {
      this.createInvoiceItems(record.id, nestedItems);
    }

    return materializeRecord(record, this.model, this.store, args);
  }

  async delete(args = {}) {
    const index = this.records.findIndex((record) => matchesWhere(record, args.where, this.model, this.store));
    if (index < 0) {
      throw modelError(this.model, "delete");
    }

    const [record] = this.records.splice(index, 1);
    cascadeDelete(this.model, record, this.store);
    return materializeRecord(record, this.model, this.store, args);
  }

  async deleteMany(args = {}) {
    const matching = this.records.filter((record) => matchesWhere(record, args.where, this.model, this.store));
    matching.forEach((record) => {
      const index = this.records.findIndex((item) => item.id === record.id);
      if (index >= 0) {
        this.records.splice(index, 1);
        cascadeDelete(this.model, record, this.store);
      }
    });
    return { count: matching.length };
  }

  async upsert(args = {}) {
    const existing = this.findRaw(args.where);
    if (existing) {
      return this.update({ where: args.where, data: args.update, include: args.include, select: args.select });
    }
    return this.create({ data: args.create, include: args.include, select: args.select });
  }

  async aggregate(args = {}) {
    const records = this.records.filter((record) => matchesWhere(record, args.where, this.model, this.store));
    const result = {};

    if (args._sum) {
      result._sum = Object.keys(args._sum).reduce((sum, field) => {
        sum[field] = records.reduce((total, record) => total + Number(record[field] || 0), 0);
        return sum;
      }, {});
    }

    if (args._avg) {
      result._avg = Object.keys(args._avg).reduce((average, field) => {
        average[field] = records.length
          ? records.reduce((total, record) => total + Number(record[field] || 0), 0) / records.length
          : null;
        return average;
      }, {});
    }

    return result;
  }

  async groupBy(args = {}) {
    const fields = Array.isArray(args.by) ? args.by : [args.by];
    const records = this.records.filter((record) => matchesWhere(record, args.where, this.model, this.store));
    const groups = new Map();

    records.forEach((record) => {
      const key = JSON.stringify(fields.map((field) => record[field]));
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(record);
    });

    return Array.from(groups.entries()).map(([key, groupRecords]) => {
      const values = JSON.parse(key);
      const group = {};
      fields.forEach((field, index) => {
        group[field] = values[index];
      });

      if (args._count) {
        group._count = { _all: groupRecords.length };
      }

      if (args._sum) {
        group._sum = Object.keys(args._sum).reduce((sum, field) => {
          sum[field] = groupRecords.reduce((total, record) => total + Number(record[field] || 0), 0);
          return sum;
        }, {});
      }

      return group;
    });
  }

  createInvoiceItems(invoiceId, items) {
    items.forEach((item) => {
      this.store.invoiceItems.push(
        normalizeDates("invoiceItem", createDefaults("invoiceItem", { ...clone(item), invoiceId }))
      );
    });
  }
}

const cascadeDelete = (model, record, store) => {
  if (model === "organization") {
    Object.values(collectionByModel).forEach((collection) => {
      if (collection !== "organizations") {
        store[collection] = store[collection].filter((item) => item.organizationId !== record.id);
      }
    });
  }

  if (model === "user") {
    store.contacts.forEach((item) => {
      if (item.assignedUserId === record.id) item.assignedUserId = null;
    });
    store.deals.forEach((item) => {
      if (item.assignedUserId === record.id) item.assignedUserId = null;
    });
    store.tasks.forEach((item) => {
      if (item.assignedUserId === record.id) item.assignedUserId = null;
    });
    store.activityLogs.forEach((item) => {
      if (item.userId === record.id) item.userId = null;
    });
  }

  if (model === "contact") {
    store.deals.forEach((item) => {
      if (item.contactId === record.id) item.contactId = null;
    });
    store.tasks.forEach((item) => {
      if (item.contactId === record.id) item.contactId = null;
    });
    store.invoices.forEach((item) => {
      if (item.contactId === record.id) item.contactId = null;
    });
  }

  if (model === "deal") {
    store.tasks.forEach((item) => {
      if (item.dealId === record.id) item.dealId = null;
    });
  }

  if (model === "invoice") {
    store.invoiceItems = store.invoiceItems.filter((item) => item.invoiceId !== record.id);
  }
};

class MemoryPrisma {
  constructor(store) {
    this.store = store;
    Object.keys(collectionByModel).forEach((model) => {
      this[model] = new MemoryDelegate(model, this.store);
    });
  }

  async $transaction(action) {
    if (typeof action !== "function") {
      return Promise.all(action);
    }

    const snapshot = clone(this.store);
    try {
      return await action(this);
    } catch (error) {
      Object.keys(snapshot).forEach((key) => {
        this.store[key] = snapshot[key];
      });
      throw error;
    }
  }

  async $disconnect() {
    return undefined;
  }
}

const seedStore = () => {
  const organizationId = "8f6f95d4-74d4-4e5d-bb91-03a35d555001";
  const users = {
    admin: "8f6f95d4-74d4-4e5d-bb91-03a35d555101",
    manager: "8f6f95d4-74d4-4e5d-bb91-03a35d555102",
    sales: "8f6f95d4-74d4-4e5d-bb91-03a35d555103",
    finance: "8f6f95d4-74d4-4e5d-bb91-03a35d555104"
  };
  const contacts = {
    ahmed: "8f6f95d4-74d4-4e5d-bb91-03a35d555201",
    maria: "8f6f95d4-74d4-4e5d-bb91-03a35d555202",
    jordan: "8f6f95d4-74d4-4e5d-bb91-03a35d555203"
  };
  const deals = {
    website: "8f6f95d4-74d4-4e5d-bb91-03a35d555301",
    retainer: "8f6f95d4-74d4-4e5d-bb91-03a35d555302",
    audit: "8f6f95d4-74d4-4e5d-bb91-03a35d555303"
  };
  const invoices = {
    first: "8f6f95d4-74d4-4e5d-bb91-03a35d555401",
    paid: "8f6f95d4-74d4-4e5d-bb91-03a35d555402"
  };
  const now = new Date();
  const passwordHash = bcrypt.hashSync("Password123!", 10);
  const firstTotals = calculateInvoiceTotal(
    [
      { description: "CRM implementation sprint", quantity: 1, unitPrice: 2200 },
      { description: "Data import and cleanup", quantity: 1, unitPrice: 450 }
    ],
    120,
    100
  );
  const paidTotals = calculateInvoiceTotal(
    [{ description: "Quarterly reporting setup", quantity: 1, unitPrice: 1800 }],
    80,
    0
  );

  const store = {
    organizations: [
      createDefaults("organization", {
        id: organizationId,
        name: "NexCRM Demo Workspace",
        industry: "Professional Services",
        website: "https://nexcrm.local",
        phone: "+1 555 0148",
        address: "Remote-first sales team",
        plan: "GROWTH",
        createdAt: now,
        updatedAt: now
      })
    ],
    users: [
      createDefaults("user", {
        id: users.admin,
        organizationId,
        name: "Sara Khan",
        email: "admin@nexcrm.local",
        passwordHash,
        role: "ORG_ADMIN",
        status: "ACTIVE"
      }),
      createDefaults("user", {
        id: users.manager,
        organizationId,
        name: "David Lee",
        email: "manager@nexcrm.local",
        passwordHash,
        role: "MANAGER",
        status: "ACTIVE"
      }),
      createDefaults("user", {
        id: users.sales,
        organizationId,
        name: "Amina Patel",
        email: "sales@nexcrm.local",
        passwordHash,
        role: "SALES_USER",
        status: "ACTIVE"
      }),
      createDefaults("user", {
        id: users.finance,
        organizationId,
        name: "Noah Carter",
        email: "finance@nexcrm.local",
        passwordHash,
        role: "FINANCE_USER",
        status: "ACTIVE"
      })
    ],
    contacts: [
      createDefaults("contact", {
        id: contacts.ahmed,
        organizationId,
        assignedUserId: users.sales,
        firstName: "Ahmed",
        lastName: "Ali",
        companyName: "Bright Solutions",
        email: "ahmed@example.com",
        phone: "+923001234567",
        source: "Website",
        status: "LEAD",
        tags: ["premium", "web"],
        notes: "Interested in a premium implementation package."
      }),
      createDefaults("contact", {
        id: contacts.maria,
        organizationId,
        assignedUserId: users.manager,
        firstName: "Maria",
        lastName: "Gomez",
        companyName: "Northstar Agency",
        email: "maria@example.com",
        phone: "+1 555 0192",
        source: "Referral",
        status: "CUSTOMER",
        tags: ["retainer", "agency"],
        notes: "Existing client exploring quarterly reporting."
      }),
      createDefaults("contact", {
        id: contacts.jordan,
        organizationId,
        assignedUserId: users.sales,
        firstName: "Jordan",
        lastName: "Miller",
        companyName: "BluePeak Studio",
        email: "jordan@example.com",
        phone: "+1 555 0111",
        source: "LinkedIn",
        status: "LEAD",
        tags: ["design", "audit"],
        notes: "Asked for process audit pricing."
      })
    ],
    deals: [
      createDefaults("deal", {
        id: deals.website,
        organizationId,
        contactId: contacts.ahmed,
        assignedUserId: users.sales,
        title: "Website Development Deal",
        value: 1500,
        stage: "PROPOSAL_SENT",
        status: "OPEN",
        expectedCloseDate: dateFromNow(14)
      }),
      createDefaults("deal", {
        id: deals.retainer,
        organizationId,
        contactId: contacts.maria,
        assignedUserId: users.manager,
        title: "Quarterly Growth Retainer",
        value: 6400,
        stage: "NEGOTIATION",
        status: "OPEN",
        expectedCloseDate: dateFromNow(21)
      }),
      createDefaults("deal", {
        id: deals.audit,
        organizationId,
        contactId: contacts.jordan,
        assignedUserId: users.sales,
        title: "CRM Process Audit",
        value: 900,
        stage: "NEW_LEAD",
        status: "OPEN",
        expectedCloseDate: dateFromNow(30)
      })
    ],
    tasks: [
      createDefaults("task", {
        organizationId,
        contactId: contacts.ahmed,
        dealId: deals.website,
        assignedUserId: users.sales,
        title: "Follow up with Ahmed",
        description: "Call client about proposal questions.",
        priority: "HIGH",
        status: "PENDING",
        dueDate: dateFromNow(2)
      }),
      createDefaults("task", {
        organizationId,
        contactId: contacts.maria,
        dealId: deals.retainer,
        assignedUserId: users.manager,
        title: "Review retainer scope",
        description: "Prepare negotiation notes before Friday.",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        dueDate: dateFromNow(4)
      }),
      createDefaults("task", {
        organizationId,
        contactId: contacts.jordan,
        dealId: deals.audit,
        assignedUserId: users.sales,
        title: "Send audit discovery questions",
        description: "Collect current spreadsheet workflow details.",
        priority: "MEDIUM",
        status: "PENDING",
        dueDate: dateFromNow(7)
      })
    ],
    invoices: [
      createDefaults("invoice", {
        id: invoices.first,
        organizationId,
        contactId: contacts.maria,
        invoiceNumber: "NEX-202607-00001",
        status: "SENT",
        subtotal: firstTotals.subtotal,
        tax: firstTotals.tax,
        discount: firstTotals.discount,
        total: firstTotals.total,
        dueDate: dateFromNow(10)
      }),
      createDefaults("invoice", {
        id: invoices.paid,
        organizationId,
        contactId: contacts.ahmed,
        invoiceNumber: "NEX-202607-00002",
        status: "PAID",
        subtotal: paidTotals.subtotal,
        tax: paidTotals.tax,
        discount: paidTotals.discount,
        total: paidTotals.total,
        dueDate: dateFromNow(-4),
        issuedDate: dateFromNow(-18)
      })
    ],
    invoiceItems: [
      ...firstTotals.items.map((item) =>
        createDefaults("invoiceItem", {
          ...item,
          invoiceId: invoices.first
        })
      ),
      ...paidTotals.items.map((item) =>
        createDefaults("invoiceItem", {
          ...item,
          invoiceId: invoices.paid
        })
      )
    ],
    emailLogs: [],
    activityLogs: [
      createDefaults("activityLog", {
        organizationId,
        userId: users.admin,
        entityType: "organization",
        entityId: organizationId,
        action: "seed.created",
        description: "Demo workspace seeded"
      }),
      createDefaults("activityLog", {
        organizationId,
        userId: users.sales,
        entityType: "deal",
        entityId: deals.website,
        action: "deal.stage_updated",
        description: "Amina moved Website Development Deal to Proposal Sent"
      }),
      createDefaults("activityLog", {
        organizationId,
        userId: users.finance,
        entityType: "invoice",
        entityId: invoices.first,
        action: "invoice.sent",
        description: "Noah sent invoice NEX-202607-00001"
      })
    ]
  };

  Object.entries(collectionByModel).forEach(([model, collection]) => {
    store[collection].forEach((record) => normalizeDates(model, record));
  });

  return store;
};

export const createMemoryPrisma = () => new MemoryPrisma(seedStore());
