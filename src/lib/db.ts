import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; adapter?: PrismaBetterSqlite3 };
type PrismaClientWithOptionalDayClosure = PrismaClient & { dayClosure?: unknown };

function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL tanımlı değil.");
  }

  return new PrismaBetterSqlite3({ url });
}

function hasDayClosureDelegate(client?: PrismaClient): boolean {
  return Boolean(client && typeof (client as PrismaClientWithOptionalDayClosure).dayClosure !== "undefined");
}

const adapter = globalForPrisma.adapter ?? createAdapter();
const shouldCreateFreshClient = !globalForPrisma.prisma || !hasDayClosureDelegate(globalForPrisma.prisma);

export const prisma: PrismaClient = shouldCreateFreshClient
  ? new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })
  : (globalForPrisma.prisma as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.adapter ??= adapter;
  globalForPrisma.prisma = prisma;
}
