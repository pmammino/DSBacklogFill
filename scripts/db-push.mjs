// Runs `prisma db push` during the Vercel build so the database schema (the
// `Request` table + enums) is created/synced automatically — no manual step.
//
// It resolves the connection string from whichever env var name the linked
// Postgres store provides (legacy Vercel Postgres vs. the current Neon-backed
// integration), then hands both a pooled and a direct URL to the Prisma CLI.
//
// If no database URL is present (e.g. a preview build with no store linked),
// it skips quietly instead of failing the build.

import { execSync } from "node:child_process";

const pooled =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

const direct =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  pooled;

if (!pooled) {
  console.log(
    "[db-push] No database URL found in environment; skipping schema push.",
  );
  process.exit(0);
}

console.log("[db-push] Syncing Prisma schema to the database…");

try {
  execSync("prisma db push --skip-generate", {
    stdio: "inherit",
    env: {
      ...process.env,
      // The schema reads these two names; inject the resolved values so the
      // CLI works no matter what the store actually named them.
      POSTGRES_PRISMA_URL: pooled,
      POSTGRES_URL_NON_POOLING: direct,
    },
  });
  console.log("[db-push] Schema is up to date.");
} catch (err) {
  console.error("[db-push] Failed to sync schema to the database.");
  process.exit(1);
}
