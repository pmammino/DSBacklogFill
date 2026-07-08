import { NextResponse } from "next/server";
import type { RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseRequestForm } from "@/lib/validation";
import { REQUEST_STATUS_OPTIONS } from "@/lib/constants";
import { isJiraConfigured, updateJiraIssue } from "@/lib/jira";

export const runtime = "nodejs";

const VALID_STATUSES = REQUEST_STATUS_OPTIONS.map((o) => o.value);

// GET /api/requests/:id
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const request = await prisma.request.findUnique({ where: { id: params.id } });
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ request });
}

// PATCH /api/requests/:id — edit a request; sync the JIRA ticket if linked.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const existing = await prisma.request.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await req.formData();

  // Status can be edited on its own without re-validating the whole form.
  const rawStatus = form.get("status");
  const statusOnly = form.get("statusOnly") === "true";

  if (statusOnly) {
    if (typeof rawStatus !== "string" || !VALID_STATUSES.includes(rawStatus as RequestStatus)) {
      return NextResponse.json({ errors: { status: "Invalid status." } }, { status: 400 });
    }
    const updated = await prisma.request.update({
      where: { id: params.id },
      data: { status: rawStatus as RequestStatus },
    });
    return NextResponse.json({ request: updated });
  }

  const { data, errors } = parseRequestForm(form);
  if (!data) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const status =
    typeof rawStatus === "string" && VALID_STATUSES.includes(rawStatus as RequestStatus)
      ? (rawStatus as RequestStatus)
      : existing.status;

  const warnings: string[] = [];
  if (existing.jiraKey && isJiraConfigured()) {
    try {
      await updateJiraIssue(existing.jiraKey, data);
    } catch (err) {
      warnings.push(`JIRA ticket could not be updated: ${(err as Error).message}`);
    }
  }

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: {
      requesterName: data.requesterName,
      description: data.description,
      sport: data.sport,
      type: data.type,
      dataLink: data.dataLink,
      businessCase: data.businessCase,
      dueDate: data.dueDate,
      status,
    },
  });

  return NextResponse.json({ request: updated, warnings });
}

// DELETE /api/requests/:id — remove the local record (JIRA ticket is kept).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const existing = await prisma.request.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.request.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
