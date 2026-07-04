import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const server = app.listen(env.port, env.host, () => {
  console.log(`NexCRM API listening on http://${env.host}:${env.port}/api`);
});

const shutdown = async () => {
  console.log("Shutting down NexCRM API...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
