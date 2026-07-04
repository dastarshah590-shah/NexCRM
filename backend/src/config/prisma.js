import { PrismaClient } from "@prisma/client";
import { env, isProduction } from "./env.js";
import { createMemoryPrisma } from "./memoryPrisma.js";

export const prisma =
  env.dataProvider === "memory"
    ? createMemoryPrisma()
    : new PrismaClient({
        log: isProduction ? ["error"] : ["warn", "error"]
      });

if (!isProduction && env.dataProvider === "memory") {
  console.log("NexCRM API using seeded in-memory data provider");
}
