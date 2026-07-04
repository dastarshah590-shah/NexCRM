import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { paginated, success } from "../utils/responseHandler.js";
import { getPagination } from "../utils/pagination.js";
import { compact, toEnum } from "../utils/normalize.js";
import { createActivityLog } from "../services/activityLogService.js";

const nullableText = z.string().optional().nullable();
const optionalEmail = z
  .union([z.string().email(), z.literal("")])
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));
const contactStatusSchema = z.preprocess(toEnum, z.enum(["LEAD", "CUSTOMER", "ARCHIVED"]));

const contactFields = {
  firstName: z.string().min(1),
  lastName: nullableText,
  companyName: nullableText,
  email: optionalEmail,
  phone: nullableText,
  address: nullableText,
  source: nullableText,
  status: contactStatusSchema.default("LEAD"),
  tags: z.array(z.string()).default([]),
  notes: nullableText,
  assignedUserId: z.string().uuid().optional().nullable()
};

export const listContactsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: contactStatusSchema.optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const createContactSchema = z.object({
  body: z.object(contactFields)
});

export const updateContactSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object(contactFields).partial()
});

export const contactIdSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});

const ensureAssignedUser = async (organizationId, assignedUserId) => {
  if (!assignedUserId) {
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: assignedUserId, organizationId }
  });

  if (!user) {
    throw new HttpError(400, "Assigned user must belong to this organization");
  }
};

const buildContactData = (body) =>
  compact({
    firstName: body.firstName,
    lastName: body.lastName,
    companyName: body.companyName,
    email: body.email,
    phone: body.phone,
    address: body.address,
    source: body.source,
    status: body.status,
    tags: body.tags,
    notes: body.notes,
    assignedUserId: body.assignedUserId === undefined ? undefined : body.assignedUserId || null
  });

const contactInclude = {
  assignedUser: { select: { id: true, name: true, email: true } },
  deals: {
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, value: true, stage: true, status: true }
  },
  tasks: {
    orderBy: { dueDate: "asc" },
    take: 5,
    select: { id: true, title: true, priority: true, status: true, dueDate: true }
  },
  invoices: {
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, invoiceNumber: true, total: true, status: true, dueDate: true }
  }
};

export const listContacts = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.validated.query);
  const { search, status } = req.validated.query;

  const where = {
    organizationId: req.organizationId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { assignedUser: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.contact.count({ where })
  ]);

  paginated(res, "contacts", contacts, total, pagination, "Contacts loaded");
});

export const getContact = asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { id: req.validated.params.id, organizationId: req.organizationId },
    include: contactInclude
  });

  if (!contact) {
    throw notFound("Contact");
  }

  success(res, { contact }, "Contact loaded");
});

export const createContact = asyncHandler(async (req, res) => {
  await ensureAssignedUser(req.organizationId, req.validated.body.assignedUserId);

  const contact = await prisma.contact.create({
    data: {
      ...buildContactData(req.validated.body),
      organizationId: req.organizationId
    },
    include: contactInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "contact",
    entityId: contact.id,
    action: "contact.created",
    description: `${req.user.name} added ${contact.firstName} ${contact.lastName || ""}`.trim()
  });

  success(res, { contact }, "Contact created successfully", 201);
});

export const updateContact = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await ensureAssignedUser(req.organizationId, req.validated.body.assignedUserId);

  const exists = await prisma.contact.findFirst({
    where: { id, organizationId: req.organizationId }
  });

  if (!exists) {
    throw notFound("Contact");
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: buildContactData(req.validated.body),
    include: contactInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "contact",
    entityId: contact.id,
    action: "contact.updated",
    description: `${req.user.name} updated ${contact.firstName}`
  });

  success(res, { contact }, "Contact updated successfully");
});

export const deleteContact = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const exists = await prisma.contact.findFirst({
    where: { id, organizationId: req.organizationId }
  });

  if (!exists) {
    throw notFound("Contact");
  }

  await prisma.contact.delete({ where: { id } });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "contact",
    entityId: id,
    action: "contact.deleted",
    description: `${req.user.name} deleted ${exists.firstName}`
  });

  success(res, {}, "Contact deleted successfully");
});


