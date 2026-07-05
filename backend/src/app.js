import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProduction } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import dealRoutes from "./routes/dealRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware.js";

export const app = express();

app.use(helmet());

const localPreviewOrigins = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
const vercelPreviewOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
const configuredOrigins = env.clientUrl
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        configuredOrigins.includes(origin) ||
        localPreviewOrigins.some((pattern) => pattern.test(origin)) ||
        vercelPreviewOrigin.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (!isProduction) {
  app.use(morgan("dev"));
}

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "NexCRM API is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", organizationRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
