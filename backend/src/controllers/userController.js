import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { success } from "../utils/responseHandler.js";
import { toEnum, compact } from "../utils/normalize.js";
import { getRolePermissions } from "../utils/permissions.js";
import { sendEmail } from "../services/emailService.js";
import { createActivityLog } from "../services/activityLogService.js";

const roleSchema = z.preprocess(toEnum, z.enum([
  "ORG_ADMIN",
  "MANAGER",
  "SALES_USER",
  "FINANCE_USER",
  "VIEWER"
]));

const statusSchema = z.preprocess(toEnum, z.enum(["ACTIVE", "INACTIVE", "INVITED"]));

const publicTeamUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const inviteUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email().transform((value) => value.toLowerCase()),
    role: roleSchema.default("SALES_USER"),
    password: z.string().min(8).optional()
  })
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional()
  })
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { organizationId: req.organizationId },
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  success(res, { users: users.map(publicTeamUser) }, "Team users loaded");
});

export const inviteUser = asyncHandler(async (req, res) => {
  const { name, email, role, password } = req.validated.body;
  const generatedPassword = password || `NexCRM-${crypto.randomBytes(4).toString("hex")}`;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      status: "ACTIVE",
      organizationId: req.organizationId,
      passwordHash: await bcrypt.hash(generatedPassword, 12)
    }
  });

  await sendEmail({
    organizationId: req.organizationId,
    to: email,
    subject: "You have been invited to NexCRM",
    templateName: "user_invitation",
    html: `<p>Hello ${name},</p><p>You have been invited to NexCRM.</p><p>Temporary password: <strong>${generatedPassword}</strong></p>`
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "user",
    entityId: user.id,
    action: "user.invited",
    description: `${req.user.name} invited ${name}`
  });

  success(res, { user: publicTeamUser(user) }, "User invited successfully", 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const target = await prisma.user.findFirst({
    where: { id, organizationId: req.organizationId }
  });

  if (!target) {
    throw notFound("User");
  }

  if (target.id === req.user.id && req.validated.body.status === "INACTIVE") {
    throw new HttpError(400, "You cannot deactivate your own account");
  }

  const user = await prisma.user.update({
    where: { id },
    data: compact(req.validated.body)
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "user",
    entityId: user.id,
    action: "user.updated",
    description: `${req.user.name} updated ${user.name}`
  });

  success(res, { user: publicTeamUser(user) }, "User updated successfully");
});

export const listPermissions = asyncHandler(async (_req, res) => {
  const roles = ["ORG_ADMIN", "MANAGER", "SALES_USER", "FINANCE_USER", "VIEWER"].map((role) => ({
    role,
    permissions: getRolePermissions(role)
  }));

  success(res, { roles }, "Role permissions loaded");
});
