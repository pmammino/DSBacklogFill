import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads / serverless invocations to
// avoid exhausting the database connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel's Postgres integrations expose the connection string under different
// names depending on vintage: legacy Vercel Postgres uses POSTGRES_PRISMA_URL,
// while the current Neon-backed integration injects DATABASE_URL / POSTGRES_URL
// (and *_NON_POOLING / *_UNPOOLED for the direct connection). Resolve whichever
// is present so the app works regardless of which store was provisioned.
function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    undefined
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
