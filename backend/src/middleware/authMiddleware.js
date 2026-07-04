import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [, token] = header.startsWith("Bearer ") ? header.split(" ") : [];

  if (!token) {
    throw new HttpError(401, "Authentication token is required");
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    throw new HttpError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { organization: true }
  });

  if (!user || user.status !== "ACTIVE") {
    throw new HttpError(401, "User account is not active");
  }

  req.user = user;
  req.organizationId = user.organizationId;
  next();
});
