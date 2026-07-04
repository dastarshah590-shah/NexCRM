import { prisma } from "../config/prisma.js";

export const createActivityLog = async ({
  organizationId,
  userId,
  entityType,
  entityId,
  action,
  description
}) => {
  if (!organizationId || !action) {
    return null;
  }

  try {
    return await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        entityType,
        entityId,
        action,
        description
      }
    });
  } catch (error) {
    console.warn("Failed to write activity log:", error.message);
    return null;
  }
};
