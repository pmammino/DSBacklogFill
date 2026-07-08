# Deploying to Vercel

Step-by-step guide to get the Data Science Backlog app live on Vercel with a
Postgres database and JIRA integration.

Estimated time: ~15 minutes.

---

## Prerequisites

- A [Vercel](https://vercel.com) account with access to import this GitHub repo.
- A JIRA Cloud API token — create one at
  https://id.atlassian.com/manage-profile/security/api-tokens
  (log in as `paul.mammino@gdcgroup.com`, click **Create API token**, copy it).

---

## 1. Import the repository

1. In Vercel, click **Add New… → Project**.
2. Select the `pmammino/DSBacklogFill` repository and click **Import**.
3. Vercel auto-detects **Next.js** — leave the Framework Preset, build command
   (`next build`), and output settings at their defaults.
4. **Do not deploy yet** — add the database and env vars first (below), then
   deploy. If you already deployed, that's fine; just redeploy after step 3.

---

## 2. Add a Postgres database

1. In the project, go to the **Storage** tab → **Create Database** → **Postgres**
   (Neon-backed). Give it a name and pick a region close to your users.
2. Click **Connect** to link it to this project. Vercel automatically injects
   these environment variables into all environments:
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

   (These are exactly the two names the app's Prisma schema reads.)

---

## 3. Add the JIRA environment variables

Project → **Settings → Environment Variables**. Add each of these for the
**Production** (and **Preview**, if you want PR previews to work) environments:

| Name | Value |
| --- | --- |
| `JIRA_BASE_URL` | `https://gdcgroup.atlassian.net` |
| `JIRA_EMAIL` | `paul.mammino@gdcgroup.com` |
| `JIRA_API_TOKEN` | *(the API token you created — keep this secret)* |
| `JIRA_PROJECT_KEY` | `RD` |
| `JIRA_ISSUE_TYPE` | `Story` |
| `JIRA_ASSIGNEE_ACCOUNT_ID` | `712020:93c31c35-3125-4b27-94c9-4a143f5ca192` |
| `JIRA_PARENT_KEY` | `RD-7014` |
| `JIRA_DEFAULT_LABELS` | `data-science-request` |

> `JIRA_PARENT_KEY=RD-7014` nests every request under the **"Data Science -
> Backlog"** epic. `JIRA_ASSIGNEE_ACCOUNT_ID` is Paul Mammino. Change either if
> your triage process differs.

---

## 4. Create the database tables

The schema needs to be pushed to the new database once. The simplest way is
from your machine using the production connection strings:

1. In Vercel, open **Storage → your database → `.env.local`** tab and copy the
   `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` values.
2. Locally in the repo:

   ```bash
   npm install
   # paste the two POSTGRES_* values into a local .env file, then:
   npx prisma db push
   ```

   This creates the `Request` table and enums. You only do this once (and again
   whenever `prisma/schema.prisma` changes).

> Alternative (no local setup): use Vercel's **Storage → Query** console, or a
> tool like Neon's SQL editor, and run the SQL from
> `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`.

---

## 5. Deploy

Click **Deploy** (or **Redeploy** if you deployed earlier so the new env vars
and database are picked up). The build runs `prisma generate && next build`
automatically.

---

## 6. Verify

Once live, open:

- `https://<your-app>.vercel.app/` — the requests dashboard (empty at first).
- `https://<your-app>.vercel.app/api/jira/health` — should return
  `{"configured": true, "ok": true, "user": "Paul Mammino"}`. If `ok` is false,
  re-check `JIRA_EMAIL` / `JIRA_API_TOKEN`.
- `https://<your-app>.vercel.app/new` — submit a test request and confirm a
  ticket appears in JIRA under **RD-7014**, assigned to Paul, then delete the
  test row from the dashboard (the JIRA ticket is left intact — close it in
  JIRA if needed).

---

## Ongoing

- **Every push to the default branch** triggers a production deploy; PRs get
  preview deploys.
- **Schema changes**: after editing `prisma/schema.prisma`, run
  `npx prisma db push` against the production DB (step 4) before/after deploy.
- **Access control**: v1 has no login. If you need to restrict access, enable
  [Vercel Authentication / password protection](https://vercel.com/docs/security/deployment-protection)
  on the project (Settings → Deployment Protection), or add app-level auth later.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Dashboard 500s / "Can't reach database" | Postgres store not connected, or `prisma db push` never run. Re-check step 2 & 4. |
| Requests save but no JIRA ticket (warning shown) | JIRA env vars missing/invalid. Check `/api/jira/health`. |
| `401/403` from JIRA | API token wrong or `JIRA_EMAIL` doesn't match the token owner. |
| Ticket created but not under the epic | `JIRA_PARENT_KEY` wrong, or the issue type can't be an epic child. Confirm `RD-7014` and `JIRA_ISSUE_TYPE=Story`. |
| Attachments don't upload | JIRA attachment size/type limits, or the token lacks permission on RD. Check the warning message on submit. |
