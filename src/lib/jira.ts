/**
 * Minimal JIRA Cloud REST API v3 client used to turn a submitted request into
 * a ticket. Everything is configured through environment variables so no
 * credentials or account-specific values live in the codebase.
 */

import type { Request } from "@prisma/client";
import { requestTypeLabel } from "./constants";

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
  assigneeAccountId?: string;
  parentKey?: string;
  defaultLabels: string[];
}

export class JiraConfigError extends Error {}

export function getJiraConfig(): JiraConfig {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/+$/, "");
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  const missing = [
    ["JIRA_BASE_URL", baseUrl],
    ["JIRA_EMAIL", email],
    ["JIRA_API_TOKEN", apiToken],
    ["JIRA_PROJECT_KEY", projectKey],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new JiraConfigError(
      `JIRA is not configured. Missing environment variables: ${missing.join(", ")}.`,
    );
  }

  return {
    baseUrl: baseUrl!,
    email: email!,
    apiToken: apiToken!,
    projectKey: projectKey!,
    issueType: process.env.JIRA_ISSUE_TYPE || "Story",
    assigneeAccountId: process.env.JIRA_ASSIGNEE_ACCOUNT_ID || undefined,
    parentKey: process.env.JIRA_PARENT_KEY || undefined,
    defaultLabels: (process.env.JIRA_DEFAULT_LABELS || "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean),
  };
}

export function isJiraConfigured(): boolean {
  try {
    getJiraConfig();
    return true;
  } catch {
    return false;
  }
}

function authHeader(config: JiraConfig): string {
  const token = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  return `Basic ${token}`;
}

/** Labels cannot contain spaces in JIRA; normalize sport/type into a label. */
function toLabel(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** Build an Atlassian Document Format description from a request. */
function buildDescriptionADF(request: {
  requesterName: string;
  description: string;
  sport: string;
  type: Request["type"];
  dataLink?: string | null;
  businessCase: string;
  dueDate?: Date | null;
}) {
  const field = (label: string, value: string) => ({
    type: "paragraph",
    content: [
      { type: "text", text: `${label}: `, marks: [{ type: "strong" }] },
      { type: "text", text: value || "—" },
    ],
  });

  const content: unknown[] = [
    field("Requester", request.requesterName),
    field("Sport", request.sport),
    field("Request Type", requestTypeLabel(request.type)),
  ];

  if (request.dueDate) {
    content.push(field("Requested Due Date", request.dueDate.toISOString().slice(0, 10)));
  }

  if (request.dataLink) {
    content.push({
      type: "paragraph",
      content: [
        { type: "text", text: "Current data location: ", marks: [{ type: "strong" }] },
        {
          type: "text",
          text: request.dataLink,
          marks: [{ type: "link", attrs: { href: request.dataLink } }],
        },
      ],
    });
  }

  content.push(
    { type: "rule" },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Description of Request" }] },
    { type: "paragraph", content: [{ type: "text", text: request.description || "—" }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Business Use Case / Value" }] },
    { type: "paragraph", content: [{ type: "text", text: request.businessCase || "—" }] },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Submitted via the Data Science Backlog intake form.",
          marks: [{ type: "em" }],
        },
      ],
    },
  );

  return { type: "doc", version: 1, content };
}

export interface CreateIssueResult {
  key: string;
  url: string;
  /** Warning surfaced to the caller (e.g. the reporter could not be set). */
  warning?: string;
}

async function postIssue(
  config: JiraConfig,
  fields: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
}

/** Create a JIRA issue for a request. Returns the issue key and browse URL. */
export async function createJiraIssue(request: {
  requesterName: string;
  requesterAccountId?: string | null;
  description: string;
  sport: string;
  type: Request["type"];
  dataLink?: string | null;
  businessCase: string;
  dueDate?: Date | null;
}): Promise<CreateIssueResult> {
  const config = getJiraConfig();

  // Titles end with "- DS" (the requester is captured in the description body).
  const summary = `[${request.sport}] ${requestTypeLabel(request.type)} - DS`.slice(
    0,
    240,
  );

  const fields: Record<string, unknown> = {
    project: { key: config.projectKey },
    issuetype: { name: config.issueType },
    summary,
    description: buildDescriptionADF(request),
    labels: [
      ...config.defaultLabels,
      toLabel(request.sport),
      toLabel(requestTypeLabel(request.type)),
    ].filter(Boolean),
  };

  if (config.assigneeAccountId) {
    fields.assignee = { accountId: config.assigneeAccountId };
  }
  if (config.parentKey) {
    fields.parent = { key: config.parentKey };
  }
  if (request.dueDate) {
    // JIRA duedate expects yyyy-MM-dd.
    fields.duedate = request.dueDate.toISOString().slice(0, 10);
  }

  // Set the requester as the ticket Reporter when we have their account.
  const hasReporter = Boolean(request.requesterAccountId);
  if (hasReporter) {
    fields.reporter = { accountId: request.requesterAccountId };
  }

  let res = await postIssue(config, fields);
  let warning: string | undefined;

  // Setting the reporter requires the API account to hold the "Modify Reporter"
  // permission. If that's the only thing that failed, drop it and retry so a
  // ticket is still created — the requester is also recorded in the body.
  if (!res.ok && hasReporter) {
    const firstError = await res.text();
    delete fields.reporter;
    res = await postIssue(config, fields);
    if (res.ok) {
      warning = `Ticket created, but the requester could not be set as Reporter (likely a JIRA permission). Detail: ${firstError}`;
    }
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`JIRA issue creation failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { key: string };
  return {
    key: data.key,
    url: `${config.baseUrl}/browse/${data.key}`,
    warning,
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  email?: string;
}

/** Search assignable/active Atlassian users for the requester picker. */
export async function searchJiraUsers(query: string): Promise<JiraUser[]> {
  const config = getJiraConfig();
  const url = `${config.baseUrl}/rest/api/3/user/search?query=${encodeURIComponent(
    query,
  )}&maxResults=15`;

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(config),
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`JIRA user search failed (${res.status}): ${await res.text()}`);
  }

  const users = (await res.json()) as {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    accountType?: string;
    active?: boolean;
  }[];

  return users
    .filter((u) => u.active !== false && u.accountType === "atlassian")
    .map((u) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      email: u.emailAddress,
    }));
}

/** Attach files to an existing JIRA issue. Best-effort per file. */
export async function attachFilesToIssue(
  issueKey: string,
  files: File[],
): Promise<{ attached: string[]; failed: { name: string; error: string }[] }> {
  const config = getJiraConfig();
  const attached: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const file of files) {
    try {
      const form = new FormData();
      form.append("file", file, file.name);

      const res = await fetch(
        `${config.baseUrl}/rest/api/3/issue/${issueKey}/attachments`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader(config),
            Accept: "application/json",
            // Required by JIRA for the attachments endpoint.
            "X-Atlassian-Token": "no-check",
          },
          body: form,
        },
      );

      if (!res.ok) {
        failed.push({ name: file.name, error: `${res.status} ${await res.text()}` });
      } else {
        attached.push(file.name);
      }
    } catch (err) {
      failed.push({ name: file.name, error: (err as Error).message });
    }
  }

  return { attached, failed };
}

/** Update the summary/description of an existing issue when a request is edited. */
export async function updateJiraIssue(
  issueKey: string,
  request: {
    requesterName: string;
    requesterAccountId?: string | null;
    description: string;
    sport: string;
    type: Request["type"];
    dataLink?: string | null;
    businessCase: string;
    dueDate?: Date | null;
  },
): Promise<void> {
  const config = getJiraConfig();

  // Titles end with "- DS" (the requester is captured in the description body).
  const summary = `[${request.sport}] ${requestTypeLabel(request.type)} - DS`.slice(
    0,
    240,
  );

  const fields: Record<string, unknown> = {
    summary,
    description: buildDescriptionADF(request),
  };
  fields.duedate = request.dueDate ? request.dueDate.toISOString().slice(0, 10) : null;

  const hasReporter = Boolean(request.requesterAccountId);
  if (hasReporter) {
    fields.reporter = { accountId: request.requesterAccountId };
  }

  const put = () =>
    fetch(`${config.baseUrl}/rest/api/3/issue/${issueKey}`, {
      method: "PUT",
      headers: {
        Authorization: authHeader(config),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

  let res = await put();

  // If updating the reporter isn't permitted, retry without it so the rest of
  // the edit still lands.
  if (!res.ok && hasReporter) {
    delete fields.reporter;
    res = await put();
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`JIRA issue update failed (${res.status}): ${detail}`);
  }
}

/** Lightweight connectivity check for the health endpoint. */
export async function checkJiraConnection(): Promise<{
  ok: boolean;
  user?: string;
  error?: string;
}> {
  try {
    const config = getJiraConfig();
    const res = await fetch(`${config.baseUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: authHeader(config),
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return { ok: false, error: `${res.status} ${await res.text()}` };
    }
    const data = (await res.json()) as { displayName?: string; emailAddress?: string };
    return { ok: true, user: data.displayName || data.emailAddress };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
