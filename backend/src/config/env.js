import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || "127.0.0.1",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "development_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  sendgridApiKey: process.env.SENDGRID_API_KEY || "",
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || "",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  dataProvider: process.env.DATA_PROVIDER || "prisma",
  nodeEnv: process.env.NODE_ENV || "development"
};

export const isProduction = env.nodeEnv === "production";
