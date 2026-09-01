# Neon Deployment

This first persistence milestone stores each signed-in user's board tasks in Neon Postgres. It keeps the existing client-side teams and project settings unchanged, but created, edited, moved, assigned, and commented tasks survive a refresh.

## 1. Create the database

1. Create a Neon project and database.
2. Copy the pooled connection string from the Neon dashboard.
3. Run `npm run db:migrate` to apply all committed migrations to the configured database. Alternatively, run `db/migrations/001_create_user_board_states.sql` in the Neon SQL Editor.

## 2. Configure local development

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the Neon connection string. Generate `NEXTAUTH_SECRET` with PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Start the app with `npm run dev`, sign in, then add or edit a task. The board is stored under the signed-in account email.

## 3. Deploy to Vercel

1. Push the current branch to GitHub. The workflow in `.github/workflows/ci.yml` must pass before deploying.
2. Import this repository into Vercel and leave the detected Next.js settings unchanged.
3. Add `DATABASE_URL`, `NEXTAUTH_SECRET`, `DEMO_USER_EMAIL`, and `DEMO_USER_PASSWORD` to Preview and Production environment variables.
4. Deploy once to obtain the generated Vercel URL, then add `NEXTAUTH_URL` with that exact `https://...vercel.app` URL to the matching environment.
5. Redeploy so NextAuth receives the final callback URL.

For a custom domain, change `NEXTAUTH_URL` to the custom HTTPS URL and redeploy. Do not use a trailing slash.

The Neon connection string and `NEXTAUTH_SECRET` are server-only secrets. Never prefix either value with `NEXT_PUBLIC_`.

## Current boundary

This is a temporary persistence bridge, not the final multi-tenant schema. The next migration should normalize users, workspaces, memberships, projects, columns, tasks, assignees, and comments so several users can collaborate on the same board with server-enforced roles.