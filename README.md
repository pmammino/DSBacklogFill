# Data Science Backlog

A simple internal app for submitting **Data Science work requests** and tracking
them. Every submission automatically opens a **JIRA ticket** (assigned to a
configured person and optionally nested under a parent/epic), and the dashboard
lets anyone **search, filter, and edit** requests and jump straight to the
linked JIRA issue.

Built with Next.js (App Router) + Prisma + Vercel Postgres, ready to deploy to
Vercel.

---

## Features

- **Intake form** capturing everything the team needs:
  - Requester name
  - Description of the request
  - Sport the request is for
  - Type of request (Research, Projections, Algorithm Update, Other)
  - Optional link to where the relevant data currently lives
  - Business use case / value description
  - Optional due date
  - Optional file attachments (uploaded straight to the JIRA ticket)
- **Automatic JIRA ticket creation** on submit — assigned to a configured
  account, optionally parented under an epic/issue, and labeled by sport & type.
- **Dashboard** with instant client-side search, sport/type/status filters,
  inline status changes, edit (which syncs back to JIRA), and delete.
- No login required for v1 (protect at the Vercel/platform level if you need to).

---

## Getting started (local)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from the template and fill it in:

   ```bash
   cp .env.example .env
   ```

   See [Environment variables](#environment-variables) below.

3. Push the schema to your database and generate the client:

   ```bash
   npm run db:push
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_PRISMA_URL` | ✅ | Pooled Postgres connection string (Vercel injects this). |
| `POSTGRES_URL_NON_POOLING` | ✅ | Direct Postgres connection string, used for migrations. |
| `JIRA_BASE_URL` | ✅ (for JIRA) | e.g. `https://your-company.atlassian.net` |
| `JIRA_EMAIL` | ✅ (for JIRA) | Email of the account that owns the API token. |
| `JIRA_API_TOKEN` | ✅ (for JIRA) | [Create one here](https://id.atlassian.com/manage-profile/security/api-tokens). |
| `JIRA_PROJECT_KEY` | ✅ (for JIRA) | Short project key, e.g. `DS`. |
| `JIRA_ISSUE_TYPE` | optional | Issue type for new requests. Defaults to `Task`. |
| `JIRA_ASSIGNEE_ACCOUNT_ID` | optional | Atlassian **accountId** every ticket is assigned to. |
| `JIRA_PARENT_KEY` | optional | Parent/epic key to nest tickets under, e.g. `DS-100`. |
| `JIRA_DEFAULT_LABELS` | optional | Comma-separated labels added to every ticket. |

> If the JIRA variables are not set, the app still works — requests are saved
> and the dashboard functions, but no ticket is created (a warning is shown).

### Finding the assignee `accountId`

Deploy (or run locally) and open `/api/jira/health`. If your credentials are
valid it returns the authenticated user. To get another person's `accountId`,
open their profile in JIRA — the URL contains it
(`.../jira/people/<accountId>`), or ask an admin.

---

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. In the Vercel project, add a **Postgres** store
   (Storage → Create → Postgres). Vercel automatically sets
   `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`.
3. Add the `JIRA_*` environment variables (Project → Settings → Environment
   Variables).
4. Run the initial schema push once against the production DB. The simplest
   way is locally with the production connection strings:

   ```bash
   npm run db:push
   ```

   (Or run it from a one-off Vercel deploy hook / CI step.)
5. Deploy. `npm run build` runs `prisma generate` automatically.

---

## Project layout

```
prisma/schema.prisma        Data model (Request) + enums
src/lib/jira.ts             JIRA REST v3 client (create/update/attach)
src/lib/validation.ts       Form parsing & validation
src/lib/constants.ts        Sports list, request types, statuses
src/app/api/requests/       REST endpoints (list/create/get/edit/delete)
src/app/api/jira/health/    JIRA connectivity check
src/app/page.tsx            Dashboard (search / filter / edit)
src/app/new/page.tsx        Submission form
src/app/requests/[id]/edit  Edit form
src/components/             RequestForm, RequestsDashboard
```

---

## Notes

- Attachments are streamed directly to JIRA and are **not** stored in Vercel.
- Editing a request also updates the linked JIRA ticket's summary, description,
  and due date. Deleting a request removes only the local tracker row; the JIRA
  ticket is intentionally left intact.
