import { NextResponse } from "next/server";
import { checkJiraConnection, isJiraConfigured } from "@/lib/jira";

export const runtime = "nodejs";

// GET /api/jira/health — quick check that JIRA credentials work.
export async function GET() {
  if (!isJiraConfigured()) {
    return NextResponse.json({
      configured: false,
      ok: false,
      message: "JIRA_* environment variables are not set.",
    });
  }
  const result = await checkJiraConnection();
  return NextResponse.json({ configured: true, ...result });
}
