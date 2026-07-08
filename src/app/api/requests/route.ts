import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseRequestForm } from "@/lib/validation";
import {
  attachFilesToIssue,
  createJiraIssue,
  isJiraConfigured,
} from "@/lib/jira";

export const runtime = "nodejs";

// GET /api/requests — list with optional search/filter query params.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const sport = searchParams.get("sport")?.trim();
  const type = searchParams.get("type")?.trim();
  const status = searchParams.get("status")?.trim();

  const where: Record<string, unknown> = {};
  if (sport) where.sport = sport;
  if (type) where.type = type;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { requesterName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { businessCase: { contains: q, mode: "insensitive" } },
      { jiraKey: { contains: q, mode: "insensitive" } },
    ];
  }

  const requests = await prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

// POST /api/requests — create a request, open a JIRA ticket, attach files.
export async function POST(req: Request) {
  const form = await req.formData();
  const { data, errors, files } = parseRequestForm(form);

  if (!data) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  let jiraKey: string | null = null;
  let jiraUrl: string | null = null;
  const attachmentNames: string[] = [];
  const warnings: string[] = [];

  if (isJiraConfigured()) {
    try {
      const issue = await createJiraIssue(data);
      jiraKey = issue.key;
      jiraUrl = issue.url;
      if (issue.warning) warnings.push(issue.warning);

      if (files.length > 0) {
        const result = await attachFilesToIssue(issue.key, files);
        attachmentNames.push(...result.attached);
        for (const f of result.failed) {
          warnings.push(`Attachment "${f.name}" failed to upload: ${f.error}`);
        }
      }
    } catch (err) {
      // The request is still saved even if JIRA is unreachable, so nothing is
      // lost — surface a warning and let it be retried from the edit view.
      warnings.push(
        `Request saved, but the JIRA ticket could not be created: ${(err as Error).message}`,
      );
    }
  } else {
    warnings.push(
      "JIRA is not configured, so no ticket was created. Set the JIRA_* environment variables to enable it.",
    );
  }

  const created = await prisma.request.create({
    data: {
      requesterName: data.requesterName,
      requesterAccountId: data.requesterAccountId,
      description: data.description,
      sport: data.sport,
      type: data.type,
      dataLink: data.dataLink,
      businessCase: data.businessCase,
      dueDate: data.dueDate,
      jiraKey,
      jiraUrl,
      attachmentNames,
    },
  });

  return NextResponse.json({ request: created, warnings }, { status: 201 });
}
