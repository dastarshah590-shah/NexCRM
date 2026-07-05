import { createRequire } from "node:module";
import { env, isProduction } from "./env.js";
import { createMemoryPrisma } from "./memoryPrisma.js";

const createPrismaClient = () => {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require("@prisma/client");

  return new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"]
  });
};

export const prisma =
  env.dataProvider === "memory"
    ? createMemoryPrisma()
    : createPrismaClient();

if (!isProduction && env.dataProvider === "memory") {
  console.log("NexCRM API using seeded in-memory data provider");
}
