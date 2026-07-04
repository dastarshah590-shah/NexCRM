import { Prisma } from "@prisma/client";
import { isProduction } from "../config/env.js";

export const notFoundMiddleware = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorMiddleware = (error, _req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let details = error.details;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      message = "A record with this value already exists";
      details = error.meta;
    }

    if (error.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
    }
  }

  if (!isProduction && statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: isProduction && statusCode >= 500 ? undefined : details
  });
};
