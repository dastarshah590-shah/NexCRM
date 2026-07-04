import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/responseHandler.js";
import { compact, toEnum } from "../utils/normalize.js";
import { createActivityLog } from "../services/activityLogService.js";

const planSchema = z.preprocess(toEnum, z.enum(["FREE", "STARTER", "GROWTH", "ENTERPRISE"]));

export const updateOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    industry: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    plan: planSchema.optional()
  })
});

export const getOrganization = asyncHandler(async (req, res) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.organizationId }
  });

  success(res, { organization }, "Organization loaded");
});

export const updateOrganization = asyncHandler(async (req, res) => {
  const organization = await prisma.organization.update({
    where: { id: req.organizationId },
    data: compact(req.validated.body)
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "organization",
    entityId: req.organizationId,
    action: "organization.updated",
    description: `${req.user.name} updated organization settings`
  });

  success(res, { organization }, "Organization updated successfully");
});

export const listEmailLogs = asyncHandler(async (req, res) => {
  const emailLogs = await prisma.emailLog.findMany({
    where: { organizationId: req.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  success(res, { emailLogs }, "Email logs loaded");
});
