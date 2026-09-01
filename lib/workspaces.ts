import { createHash } from "crypto";
import { getDatabase } from "./database";

type WorkspaceRow = { id: string; slug: string; name: string; role: "owner" | "admin" | "member" | "viewer" };

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  role: WorkspaceRow["role"];
};

function personalWorkspaceSlug(email: string): string {
  return `workspace-${createHash("sha256").update(email).digest("hex").slice(0, 12)}`;
}

export async function ensureWorkspaceForUser(email: string, displayName: string): Promise<void> {
  const sql = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const slug = personalWorkspaceSlug(normalizedEmail);
  await sql`
    WITH provisioned_user AS (
      INSERT INTO users (email, display_name)
      VALUES (${normalizedEmail}, ${displayName})
      ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()
      RETURNING id
    ),
    existing_membership AS (
      SELECT 1 FROM workspace_memberships
      WHERE user_id = (SELECT id FROM provisioned_user)
      LIMIT 1
    ),
    provisioned_workspace AS (
      INSERT INTO workspaces (slug, name, created_by_user_id)
      SELECT ${slug}, ${`${displayName}'s workspace`}, id FROM provisioned_user
      WHERE NOT EXISTS (SELECT 1 FROM existing_membership)
      ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
      RETURNING id
    ),
    provisioned_membership AS (
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      SELECT provisioned_workspace.id, provisioned_user.id, 'owner'
      FROM provisioned_workspace CROSS JOIN provisioned_user
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    ),
    provisioned_project AS (
      INSERT INTO projects (workspace_id, name, description, created_by_user_id)
      SELECT provisioned_workspace.id, 'My first project', 'A project ready for your work.', provisioned_user.id
      FROM provisioned_workspace CROSS JOIN provisioned_user
      ON CONFLICT (workspace_id, name) DO UPDATE SET updated_at = NOW()
      RETURNING id
    )
    INSERT INTO board_columns (project_id, name, position)
    SELECT provisioned_project.id, defaults.name, defaults.position
    FROM provisioned_project
    CROSS JOIN (VALUES ('Backlog', 1), ('In progress', 2), ('In review', 3), ('Done', 4)) AS defaults(name, position)
    ON CONFLICT (project_id, name) DO NOTHING
  `;
}

export async function listWorkspacesForUser(email: string): Promise<Workspace[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT workspaces.id, workspaces.slug, workspaces.name, workspace_memberships.role
    FROM workspace_memberships
    INNER JOIN users ON users.id = workspace_memberships.user_id
    INNER JOIN workspaces ON workspaces.id = workspace_memberships.workspace_id
    WHERE users.email = ${email.trim().toLowerCase()}
    ORDER BY workspaces.created_at ASC
  ` as WorkspaceRow[];

  return rows.map(({ id, slug, name, role }) => ({ id, slug, name, role }));
}

type ProjectRow = { id: string; name: string; description: string };
type ColumnRow = { id: string; project_id: string; name: string; position: string };
type TaskRow = { id: string; project_id: string; column_id: string; title: string; description: string; priority: "high" | "medium" | "low"; due_at: string | null; position: string; version: number };

export async function getBoardForWorkspace(email: string, workspaceId: string) {
  const sql = getDatabase();
  const membership = await sql`
    SELECT workspace_memberships.role
    FROM workspace_memberships
    INNER JOIN users ON users.id = workspace_memberships.user_id
    WHERE workspace_memberships.workspace_id = ${workspaceId}::uuid
      AND users.email = ${email.trim().toLowerCase()}
    LIMIT 1
  ` as { role: Workspace["role"] }[];

  if (!membership[0]) return null;

  const projects = await sql`
    SELECT id, name, description FROM projects
    WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY created_at ASC
  ` as ProjectRow[];
  const columns = await sql`
    SELECT id, project_id, name, position FROM board_columns
    WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = ${workspaceId}::uuid)
    ORDER BY position ASC
  ` as ColumnRow[];
  const tasks = await sql`
    SELECT id, project_id, column_id, title, description, priority, due_at, position, version
    FROM tasks WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY position ASC
    LIMIT 1000
  ` as TaskRow[];

  return { role: membership[0].role, projects, columns, tasks };
}