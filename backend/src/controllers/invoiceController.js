import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { paginated, success } from "../utils/responseHandler.js";
import { getPagination } from "../utils/pagination.js";
import { calculateInvoiceTotal } from "../utils/calculateInvoiceTotal.js";
import { generateInvoiceNumber } from "../utils/generateInvoiceNumber.js";
import { compact, toDate, toEnum } from "../utils/normalize.js";
import { sendInvoiceEmail } from "../services/emailService.js";
import { createActivityLog } from "../services/activityLogService.js";

const invoiceStatusSchema = z.preprocess(
  toEnum,
  z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"])
);

const invoiceItemSchema = z.object({
  description: z.string().min(2),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0)
});

const invoiceFields = {
  contactId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().min(3).optional(),
  status: invoiceStatusSchema.default("DRAFT"),
  tax: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional().nullable(),
  issuedDate: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1)
};

export const listInvoicesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: invoiceStatusSchema.optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const createInvoiceSchema = z.object({ body: z.object(invoiceFields) });
export const updateInvoiceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      contactId: z.string().uuid().optional().nullable(),
      invoiceNumber: z.string().min(3).optional(),
      status: invoiceStatusSchema.optional(),
      tax: z.coerce.number().min(0).optional(),
      discount: z.coerce.number().min(0).optional(),
      dueDate: z.string().optional().nullable(),
      issuedDate: z.string().optional().nullable(),
      items: z.array(invoiceItemSchema).min(1).optional()
    })
    .partial()
});
export const invoiceIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

const invoiceInclude = {
  contact: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
  items: { orderBy: { createdAt: "asc" } }
};

const ensureContact = async (organizationId, contactId) => {
  if (!contactId) {
    return;
  }

  const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId } });
  if (!contact) {
    throw new HttpError(400, "Contact must belong to this organization");
  }
};

const itemCreateData = (items) =>
  items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total
  }));

export const listInvoices = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.validated.query);
  const { search, status } = req.validated.query;
  const where = {
    organizationId: req.organizationId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" } },
            { contact: { firstName: { contains: search, mode: "insensitive" } } },
            { contact: { lastName: { contains: search, mode: "insensitive" } } },
            { contact: { companyName: { contains: search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.invoice.count({ where })
  ]);

  paginated(res, "invoices", invoices, total, pagination, "Invoices loaded");
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.validated.params.id, organizationId: req.organizationId },
    include: invoiceInclude
  });

  if (!invoice) {
    throw notFound("Invoice");
  }

  success(res, { invoice }, "Invoice loaded");
});

export const createInvoice = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  await ensureContact(req.organizationId, body.contactId);

  const count = await prisma.invoice.count({ where: { organizationId: req.organizationId } });
  const totals = calculateInvoiceTotal(body.items, body.tax, body.discount);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: req.organizationId,
      contactId: body.contactId || null,
      invoiceNumber: body.invoiceNumber || generateInvoiceNumber(count),
      status: body.status,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      dueDate: toDate(body.dueDate),
      issuedDate: toDate(body.issuedDate),
      items: { create: itemCreateData(totals.items) }
    },
    include: invoiceInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.created",
    description: `${req.user.name} created invoice ${invoice.invoiceNumber}`
  });

  success(res, { invoice }, "Invoice created successfully", 201);
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const body = req.validated.body;
  await ensureContact(req.organizationId, body.contactId);

  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: req.organizationId },
    include: { items: true }
  });

  if (!existing) {
    throw notFound("Invoice");
  }

  const itemSource =
    body.items ||
    existing.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice)
    }));

  const totals = calculateInvoiceTotal(
    itemSource,
    body.tax === undefined ? Number(existing.tax) : body.tax,
    body.discount === undefined ? Number(existing.discount) : body.discount
  );

  const invoice = await prisma.$transaction(async (tx) => {
    if (body.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    }

    await tx.invoice.update({
      where: { id },
      data: {
        ...compact({
          contactId: body.contactId === undefined ? undefined : body.contactId || null,
          invoiceNumber: body.invoiceNumber,
          status: body.status,
          dueDate: toDate(body.dueDate),
          issuedDate: toDate(body.issuedDate)
        }),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        ...(body.items ? { items: { create: itemCreateData(totals.items) } } : {})
      }
    });

    return tx.invoice.findUnique({ where: { id }, include: invoiceInclude });
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.updated",
    description: `${req.user.name} updated invoice ${invoice.invoiceNumber}`
  });

  success(res, { invoice }, "Invoice updated successfully");
});

export const sendInvoice = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: req.organizationId },
    include: invoiceInclude
  });

  if (!invoice) {
    throw notFound("Invoice");
  }

  if (!invoice.contact?.email) {
    throw new HttpError(400, "Invoice contact must have an email address");
  }

  const emailResult = await sendInvoiceEmail(invoice);
  const updatedInvoice = await prisma.invoice.update({
    where: { id },
    data: invoice.status === "DRAFT" ? { status: "SENT" } : {},
    include: invoiceInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.sent",
    description: `${req.user.name} sent invoice ${invoice.invoiceNumber}`
  });

  success(res, { invoice: updatedInvoice, email: emailResult }, "Invoice sent successfully");
});

export const markInvoicePaid = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const existing = await prisma.invoice.findFirst({ where: { id, organizationId: req.organizationId } });

  if (!existing) {
    throw notFound("Invoice");
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: "PAID" },
    include: invoiceInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.paid",
    description: `${req.user.name} marked invoice ${invoice.invoiceNumber} as paid`
  });

  success(res, { invoice }, "Invoice marked as paid");
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const existing = await prisma.invoice.findFirst({ where: { id, organizationId: req.organizationId } });

  if (!existing) {
    throw notFound("Invoice");
  }

  await prisma.invoice.delete({ where: { id } });
  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "invoice",
    entityId: id,
    action: "invoice.deleted",
    description: `${req.user.name} deleted invoice ${existing.invoiceNumber}`
  });

  success(res, {}, "Invoice deleted successfully");
});

