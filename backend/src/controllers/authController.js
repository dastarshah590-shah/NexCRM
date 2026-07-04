import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { success } from "../utils/responseHandler.js";
import { sendEmail } from "../services/emailService.js";
import { createActivityLog } from "../services/activityLogService.js";

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  organizationId: user.organizationId,
  organization: user.organization
});

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8),
    organizationName: z.string().min(2)
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1)
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase())
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    newPassword: z.string().min(8)
  })
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, organizationName } = req.validated.body;
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName
      }
    });

    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ORG_ADMIN",
        organizationId: organization.id
      },
      include: { organization: true }
    });

    await tx.activityLog.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        entityType: "organization",
        entityId: organization.id,
        action: "organization.created",
        description: `${name} created ${organizationName}`
      }
    });

    return { organization, user };
  });

  success(
    res,
    {
      token: signToken(result.user),
      user: publicUser(result.user)
    },
    "Account created successfully",
    201
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true }
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new HttpError(403, "This account is not active");
  }

  await createActivityLog({
    organizationId: user.organizationId,
    userId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "auth.login",
    description: `${user.name} logged in`
  });

  success(res, { token: signToken(user), user: publicUser(user) }, "Logged in successfully");
});

export const me = asyncHandler(async (req, res) => {
  success(res, { user: publicUser(req.user) }, "Current user loaded");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.validated.body;
  const user = await prisma.user.findUnique({ where: { email }, include: { organization: true } });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 30)
      }
    });

    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
    await sendEmail({
      organizationId: user.organizationId,
      to: user.email,
      subject: "Reset your NexCRM password",
      templateName: "password_reset",
      html: `<p>Hello ${user.name},</p><p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    });
  }

  success(res, {}, "If the email exists, password reset instructions have been sent");
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.validated.body;

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: { gt: new Date() }
    }
  });

  if (!user) {
    throw new HttpError(400, "Invalid or expired reset token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      resetToken: null,
      resetTokenExpiresAt: null
    }
  });

  success(res, {}, "Password reset successfully");
});

export const logout = asyncHandler(async (_req, res) => {
  success(res, {}, "Logged out successfully");
});
