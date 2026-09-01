import type { z } from "zod";
import { createTaskSchema, updateTaskSchema } from "./contracts";
import { getDatabase } from "./database";

type CreateTaskInput = z.infer<typeof createTaskSchema>;
type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
type Access = { workspace_id: string; user_id: string; role: "owner" | "admin" | "member" | "viewer" };
type TaskRow = { id: string; project_id: string; column_id: string; title: string; description: string; priority: "high" | "medium" | "low"; due_at: string | null; position: string; version: number };

export type CreateTaskResult =
  | { kind: "created"; task: TaskRow }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "invalid_column" };

type TaskAccess = Access & { task_id: string };

async function getTaskAccess(email: string, taskId: string): Promise<TaskAccess | null> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT tasks.id AS task_id, tasks.workspace_id, users.id AS user_id, workspace_memberships.role
    FROM tasks
    INNER JOIN workspace_memberships ON workspace_memberships.workspace_id = tasks.workspace_id
    INNER JOIN users ON users.id = workspace_memberships.user_id
    WHERE tasks.id = ${taskId}::uuid AND users.email = ${email.trim().toLowerCase()}
    LIMIT 1
  ` as TaskAccess[];
  return rows[0] ?? null;
}

async function getProjectAccess(email: string, projectId: string): Promise<Access | null> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT projects.workspace_id, users.id AS user_id, workspace_memberships.role
    FROM projects
    INNER JOIN workspace_memberships ON workspace_memberships.workspace_id = projects.workspace_id
    INNER JOIN users ON users.id = workspace_memberships.user_id
    WHERE projects.id = ${projectId}::uuid AND users.email = ${email.trim().toLowerCase()}
    LIMIT 1
  ` as Access[];
  return rows[0] ?? null;
}

export async function createTaskForUser(email: string, projectId: string, input: CreateTaskInput): Promise<CreateTaskResult> {
  const access = await getProjectAccess(email, projectId);
  if (!access) return { kind: "not_found" };
  if (access.role === "viewer") return { kind: "forbidden" };

  const sql = getDatabase();
  const columns = await sql`
    SELECT id FROM board_columns WHERE id = ${input.columnId}::uuid AND project_id = ${projectId}::uuid LIMIT 1
  ` as { id: string }[];
  if (!columns[0]) return { kind: "invalid_column" };

  const rows = await sql`
    WITH created_task AS (
      INSERT INTO tasks (workspace_id, project_id, column_id, title, description, priority, due_at, position, created_by_user_id)
      SELECT ${access.workspace_id}::uuid, ${projectId}::uuid, ${input.columnId}::uuid, ${input.title}, ${input.description}, ${input.priority}, ${input.dueAt ?? null}::timestamptz,
        COALESCE((SELECT MAX(position) + 1024 FROM tasks WHERE column_id = ${input.columnId}::uuid), 1024), ${access.user_id}::uuid
      RETURNING id, project_id, column_id, title, description, priority, due_at, position, version
    ), audit AS (
      INSERT INTO audit_events (workspace_id, actor_user_id, event_type, entity_type, entity_id)
      SELECT ${access.workspace_id}::uuid, ${access.user_id}::uuid, 'task.created', 'task', id FROM created_task
    )
    SELECT id, project_id, column_id, title, description, priority, due_at, position, version FROM created_task
  ` as TaskRow[];
  return rows[0] ? { kind: "created", task: rows[0] } : { kind: "not_found" };
}

export async function updateTaskForUser(email: string, taskId: string, input: UpdateTaskInput) {
  const access = await getTaskAccess(email, taskId);
  if (!access) return { kind: "not_found" as const };
  if (access.role === "viewer") return { kind: "forbidden" as const };
  const sql = getDatabase();
  const rows = await sql`
    WITH updated_task AS (
      UPDATE tasks SET title = COALESCE(${input.title ?? null}, title), description = COALESCE(${input.description ?? null}, description), priority = COALESCE(${input.priority ?? null}, priority),
        due_at = CASE WHEN ${input.dueAt !== undefined} THEN ${input.dueAt ?? null}::timestamptz ELSE due_at END, version = version + 1, updated_at = NOW()
      WHERE id = ${taskId}::uuid AND version = ${input.version}
      RETURNING id, project_id, column_id, title, description, priority, due_at, position, version
    ), audit AS (
      INSERT INTO audit_events (workspace_id, actor_user_id, event_type, entity_type, entity_id)
      SELECT ${access.workspace_id}::uuid, ${access.user_id}::uuid, 'task.updated', 'task', id FROM updated_task
    ) SELECT * FROM updated_task
  ` as TaskRow[];
  return rows[0] ? { kind: "updated" as const, task: rows[0] } : { kind: "conflict" as const };
}

export async function deleteTaskForUser(email: string, taskId: string) {
  const access = await getTaskAccess(email, taskId);
  if (!access) return { kind: "not_found" as const };
  if (access.role === "viewer") return { kind: "forbidden" as const };
  const sql = getDatabase();
  const rows = await sql`
    WITH deleted_task AS (DELETE FROM tasks WHERE id = ${taskId}::uuid RETURNING id),
    audit AS (INSERT INTO audit_events (workspace_id, actor_user_id, event_type, entity_type, entity_id)
      SELECT ${access.workspace_id}::uuid, ${access.user_id}::uuid, 'task.deleted', 'task', id FROM deleted_task)
    SELECT id FROM deleted_task
  ` as { id: string }[];
  return rows[0] ? { kind: "deleted" as const } : { kind: "not_found" as const };
}

export async function moveTaskForUser(email: string, taskId: string, columnId: string, version: number) {
  const access = await getTaskAccess(email, taskId);
  if (!access) return { kind: "not_found" as const };
  if (access.role === "viewer") return { kind: "forbidden" as const };
  const sql = getDatabase();
  const rows = await sql`
    WITH target_column AS (SELECT id FROM board_columns WHERE id = ${columnId}::uuid AND project_id = (SELECT project_id FROM tasks WHERE id = ${taskId}::uuid)),
    moved_task AS (UPDATE tasks SET column_id = ${columnId}::uuid, position = COALESCE((SELECT MAX(position) + 1024 FROM tasks WHERE column_id = ${columnId}::uuid), 1024), version = version + 1, updated_at = NOW()
      WHERE id = ${taskId}::uuid AND version = ${version} AND EXISTS (SELECT 1 FROM target_column) RETURNING id, project_id, column_id, title, description, priority, due_at, position, version),
    audit AS (INSERT INTO audit_events (workspace_id, actor_user_id, event_type, entity_type, entity_id) SELECT ${access.workspace_id}::uuid, ${access.user_id}::uuid, 'task.moved', 'task', id FROM moved_task)
    SELECT * FROM moved_task
  ` as TaskRow[];
  return rows[0] ? { kind: "moved" as const, task: rows[0] } : { kind: "conflict" as const };
}

export async function createCommentForUser(email: string, taskId: string, body: string) {
  const access = await getTaskAccess(email, taskId);
  if (!access) return { kind: "not_found" as const };
  if (access.role === "viewer") return { kind: "forbidden" as const };
  const sql = getDatabase();
  const rows = await sql`
    WITH comment AS (INSERT INTO comments (task_id, author_user_id, body) VALUES (${taskId}::uuid, ${access.user_id}::uuid, ${body}) RETURNING id, task_id, author_user_id, body, created_at, updated_at),
    audit AS (INSERT INTO audit_events (workspace_id, actor_user_id, event_type, entity_type, entity_id) SELECT ${access.workspace_id}::uuid, ${access.user_id}::uuid, 'comment.created', 'comment', id FROM comment)
    SELECT * FROM comment
  ` as { id: string; task_id: string; author_user_id: string; body: string; created_at: string; updated_at: string }[];
  return rows[0] ? { kind: "created" as const, comment: rows[0] } : { kind: "not_found" as const };
}

type CommentAccess = Access & { comment_id: string; author_user_id: string };
async function getCommentAccess(email: string, commentId: string): Promise<CommentAccess | null> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT comments.id AS comment_id, comments.author_user_id, tasks.workspace_id, users.id AS user_id, workspace_memberships.role
    FROM comments INNER JOIN tasks ON tasks.id = comments.task_id
    INNER JOIN workspace_memberships ON workspace_memberships.workspace_id = tasks.workspace_id
    INNER JOIN users ON users.id = workspace_memberships.user_id
    WHERE comments.id = ${commentId}::uuid AND users.email = ${email.trim().toLowerCase()} LIMIT 1
  ` as CommentAccess[];
  return rows[0] ?? null;
}

export async function updateCommentForUser(email: string, commentId: string, body: string) {
  const access = await getCommentAccess(email, commentId);
  if (!access) return { kind: "not_found" as const };
  if (access.role === "viewer" || (access.author_user_id !== access.user_id && access.role === "member")) return { kind: "forbidden" as const };
  const sql = getDatabase();
  const rows = await sql`UPDATE comments SET body = ${body}, updated_at = NOW() WHERE id = ${commentId}::uuid RETURNING id, body` as { id: string; body: string }[];
  return rows[0] ? { kind: "updated" as const, comment: rows[0] } : { kind: "not_found" as const };
}

export async function deleteCommentForUser(email: string, commentId: string) {
  const access = await getCommentAccess(email, commentId);
  if (!access) return { kind: "not_found" as const };
  if (access.role === "viewer" || (access.author_user_id !== access.user_id && access.role === "member")) return { kind: "forbidden" as const };
  const sql = getDatabase();
  await sql`DELETE FROM comments WHERE id = ${commentId}::uuid`;
  return { kind: "deleted" as const };
}