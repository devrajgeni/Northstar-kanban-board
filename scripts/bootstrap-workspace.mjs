import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Provide the user's email address as the first argument.");

const sql = neon(process.env.DATABASE_URL);
const slug = `workspace-${createHash("sha256").update(email).digest("hex").slice(0, 12)}`;
const rows = await sql`
  WITH account AS (
    SELECT id, display_name FROM users WHERE email = ${email} AND password_hash IS NOT NULL LIMIT 1
  ), workspace AS (
    INSERT INTO workspaces (slug, name, created_by_user_id)
    SELECT ${slug}, display_name || '''s workspace', id FROM account
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id
  ), membership AS (
    INSERT INTO workspace_memberships (workspace_id, user_id, role)
    SELECT workspace.id, account.id, 'owner' FROM workspace CROSS JOIN account
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner'
  ), project AS (
    INSERT INTO projects (workspace_id, name, description, created_by_user_id)
    SELECT workspace.id, 'My first project', 'A project ready for your work.', account.id FROM workspace CROSS JOIN account
    ON CONFLICT (workspace_id, name) DO UPDATE SET updated_at = NOW()
    RETURNING id
  ), columns AS (
    INSERT INTO board_columns (project_id, name, position)
    SELECT project.id, defaults.name, defaults.position FROM project
    CROSS JOIN (VALUES ('Backlog', 1), ('In progress', 2), ('In review', 3), ('Done', 4)) AS defaults(name, position)
    ON CONFLICT (project_id, name) DO NOTHING
  )
  SELECT id FROM workspace
`;

if (!rows[0]) throw new Error("No password-backed user account was found for this email. Create the user first with npm run user:create.");

const checks = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM workspace_memberships INNER JOIN users ON users.id = workspace_memberships.user_id WHERE users.email = ${email} AND workspace_memberships.role = 'owner') AS owner_memberships,
    (SELECT COUNT(*)::int FROM projects INNER JOIN workspaces ON workspaces.id = projects.workspace_id WHERE workspaces.slug = ${slug}) AS projects,
    (SELECT COUNT(*)::int FROM board_columns INNER JOIN projects ON projects.id = board_columns.project_id INNER JOIN workspaces ON workspaces.id = projects.workspace_id WHERE workspaces.slug = ${slug}) AS columns,
    (SELECT COUNT(*)::int FROM tasks INNER JOIN workspaces ON workspaces.id = tasks.workspace_id WHERE workspaces.slug = ${slug}) AS tasks
`;
const check = checks[0];
if (check.owner_memberships !== 1 || check.projects < 1 || check.columns !== 4) throw new Error("Workspace verification failed.");
console.log(`Workspace ready: ${check.owner_memberships} owner membership, ${check.projects} project, ${check.columns} columns, ${check.tasks} tasks.`);