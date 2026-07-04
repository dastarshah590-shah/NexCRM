import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { paginated, success } from "../utils/responseHandler.js";
import { getPagination } from "../utils/pagination.js";
import { compact, toDate, toDecimalNumber, toEnum } from "../utils/normalize.js";
import { createActivityLog } from "../services/activityLogService.js";

const dealStageSchema = z.preprocess(
  toEnum,
  z.enum(["NEW_LEAD", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"])
);

const dealStatusSchema = z.preprocess(toEnum, z.enum(["OPEN", "WON", "LOST"]));

const dealFields = {
  contactId: z.string().uuid().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  title: z.string().min(2),
  value: z.coerce.number().min(0).default(0),
  stage: dealStageSchema.default("NEW_LEAD"),
  status: dealStatusSchema.optional(),
  expectedCloseDate: z.string().optional().nullable()
};

export const listDealsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    stage: dealStageSchema.optional(),
    status: dealStatusSchema.optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const createDealSchema = z.object({
  body: z.object(dealFields)
});

export const updateDealSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object(dealFields).partial()
});

export const dealIdSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});

export const updateDealStageSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ stage: dealStageSchema })
});

const dealInclude = {
  contact: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
  assignedUser: { select: { id: true, name: true, email: true } },
  tasks: {
    orderBy: { dueDate: "asc" },
    take: 3,
    select: { id: true, title: true, priority: true, status: true, dueDate: true }
  }
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

const ensureAssignedUser = async (organizationId, assignedUserId) => {
  if (!assignedUserId) {
    return;
  }

  const user = await prisma.user.findFirst({ where: { id: assignedUserId, organizationId } });
  if (!user) {
    throw new HttpError(400, "Assigned user must belong to this organization");
  }
};

const stateFromStage = (stage, status) => {
  if (!stage && !status) {
    return {};
  }

  if (stage === "WON") {
    return { status: "WON", wonAt: new Date(), lostAt: null };
  }

  if (stage === "LOST") {
    return { status: "LOST", lostAt: new Date(), wonAt: null };
  }

  if (status === "WON") {
    return { status: "WON", stage: "WON", wonAt: new Date(), lostAt: null };
  }

  if (status === "LOST") {
    return { status: "LOST", stage: "LOST", lostAt: new Date(), wonAt: null };
  }

  return { status: "OPEN", wonAt: null, lostAt: null };
};

const buildDealData = (body) => {
  const state = stateFromStage(body.stage, body.status);

  return compact({
    contactId: body.contactId === undefined ? undefined : body.contactId || null,
    assignedUserId: body.assignedUserId === undefined ? undefined : body.assignedUserId || null,
    title: body.title,
    value: body.value !== undefined ? toDecimalNumber(body.value) : undefined,
    stage: body.stage,
    status: body.status,
    expectedCloseDate: body.expectedCloseDate === undefined ? undefined : toDate(body.expectedCloseDate),
    ...state
  });
};

export const listDeals = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.validated.query);
  const { search, stage, status } = req.validated.query;
  const where = {
    organizationId: req.organizationId,
    ...(stage ? { stage } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { contact: { firstName: { contains: search, mode: "insensitive" } } },
            { contact: { lastName: { contains: search, mode: "insensitive" } } },
            { contact: { companyName: { contains: search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: dealInclude,
      orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.deal.count({ where })
  ]);

  paginated(res, "deals", deals, total, pagination, "Deals loaded");
});

export const getDeal = asyncHandler(async (req, res) => {
  const deal = await prisma.deal.findFirst({
    where: { id: req.validated.params.id, organizationId: req.organizationId },
    include: dealInclude
  });

  if (!deal) {
    throw notFound("Deal");
  }

  success(res, { deal }, "Deal loaded");
});

export const createDeal = asyncHandler(async (req, res) => {
  await ensureContact(req.organizationId, req.validated.body.contactId);
  await ensureAssignedUser(req.organizationId, req.validated.body.assignedUserId);

  const deal = await prisma.deal.create({
    data: {
      ...buildDealData(req.validated.body),
      organizationId: req.organizationId
    },
    include: dealInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "deal",
    entityId: deal.id,
    action: "deal.created",
    description: `${req.user.name} created deal ${deal.title}`
  });

  success(res, { deal }, "Deal created successfully", 201);
});

export const updateDeal = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await ensureContact(req.organizationId, req.validated.body.contactId);
  await ensureAssignedUser(req.organizationId, req.validated.body.assignedUserId);

  const exists = await prisma.deal.findFirst({ where: { id, organizationId: req.organizationId } });
  if (!exists) {
    throw notFound("Deal");
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: buildDealData(req.validated.body),
    include: dealInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "deal",
    entityId: deal.id,
    action: "deal.updated",
    description: `${req.user.name} updated deal ${deal.title}`
  });

  success(res, { deal }, "Deal updated successfully");
});

export const updateDealStage = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { stage } = req.validated.body;

  const exists = await prisma.deal.findFirst({ where: { id, organizationId: req.organizationId } });
  if (!exists) {
    throw notFound("Deal");
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      stage,
      ...stateFromStage(stage)
    },
    include: dealInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "deal",
    entityId: deal.id,
    action: "deal.stage_updated",
    description: `${req.user.name} moved ${deal.title} to ${stage}`
  });

  success(res, { deal }, "Deal stage updated successfully");
});

export const markDealWon = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const exists = await prisma.deal.findFirst({ where: { id, organizationId: req.organizationId } });
  if (!exists) {
    throw notFound("Deal");
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: { stage: "WON", ...stateFromStage("WON") },
    include: dealInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "deal",
    entityId: deal.id,
    action: "deal.won",
    description: `${req.user.name} marked ${deal.title} as won`
  });

  success(res, { deal }, "Deal marked as won");
});

export const markDealLost = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const exists = await prisma.deal.findFirst({ where: { id, organizationId: req.organizationId } });
  if (!exists) {
    throw notFound("Deal");
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: { stage: "LOST", ...stateFromStage("LOST") },
    include: dealInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "deal",
    entityId: deal.id,
    action: "deal.lost",
    description: `${req.user.name} marked ${deal.title} as lost`
  });

  success(res, { deal }, "Deal marked as lost");
});

export const deleteDeal = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const exists = await prisma.deal.findFirst({ where: { id, organizationId: req.organizationId } });

  if (!exists) {
    throw notFound("Deal");
  }

  await prisma.deal.delete({ where: { id } });
  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "deal",
    entityId: id,
    action: "deal.deleted",
    description: `${req.user.name} deleted deal ${exists.title}`
  });

  success(res, {}, "Deal deleted successfully");
});


