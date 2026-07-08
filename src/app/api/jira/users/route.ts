import { NextResponse } from "next/server";
import { isJiraConfigured, searchJiraUsers } from "@/lib/jira";

export const runtime = "nodejs";

// GET /api/jira/users?q=<query> — type-ahead search for the requester picker.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!isJiraConfigured()) {
    return NextResponse.json({ users: [], configured: false });
  }
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const users = await searchJiraUsers(q);
    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json(
      { users: [], error: (err as Error).message },
      { status: 502 },
    );
  }
}
