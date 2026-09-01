import { z } from "zod";

export const workspaceRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export function apiError(error: string, code: string): ApiError {
  return { error, code };
}

export const resourceIdSchema = z.string().uuid();
const taskPrioritySchema = z.enum(["high", "medium", "low"]);

export const workspaceSchema = z.object({
  id: resourceIdSchema,
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  role: workspaceRoleSchema,
});

export const projectSchema = z.object({
  id: resourceIdSchema,
  workspaceId: resourceIdSchema,
  name: z.string().min(1).max(160),
  description: z.string().max(10_000),
});

export const boardColumnSchema = z.object({
  id: resourceIdSchema,
  projectId: resourceIdSchema,
  name: z.string().min(1).max(120),
  position: z.string(),
});

export const taskSchema = z.object({
  id: resourceIdSchema,
  projectId: resourceIdSchema,
  columnId: resourceIdSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(10_000),
  priority: taskPrioritySchema,
  dueAt: z.string().datetime().nullable(),
  position: z.string(),
  version: z.number().int().positive(),
});

export const commentSchema = z.object({
  id: resourceIdSchema,
  taskId: resourceIdSchema,
  authorUserId: resourceIdSchema,
  body: z.string().min(1).max(10_000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const memberSchema = z.object({
  userId: resourceIdSchema,
  email: z.string().email().max(320),
  displayName: z.string().min(1).max(160),
  role: workspaceRoleSchema,
});

export const invitationSchema = z.object({
  id: resourceIdSchema,
  workspaceId: resourceIdSchema,
  email: z.string().email().max(320),
  role: z.enum(["admin", "member", "viewer"]),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
});

export const createTaskSchema = z.object({
  columnId: resourceIdSchema,
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(10_000).default(""),
  priority: taskPrioritySchema.default("medium"),
  dueAt: z.string().datetime().nullable().optional(),
  assigneeIds: z.array(resourceIdSchema).max(100).default([]),
  labelIds: z.array(resourceIdSchema).max(30).default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(10_000).optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  version: z.number().int().positive(),
}).refine(({ title, description, priority, dueAt }) => title !== undefined || description !== undefined || priority !== undefined || dueAt !== undefined, {
  message: "At least one task field must be supplied.",
});

export const moveTaskSchema = z.object({
  columnId: resourceIdSchema,
  position: z.string().regex(/^\d+(\.\d+)?$/),
  version: z.number().int().positive(),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
});

export const updateCommentSchema = createCommentSchema;

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["admin", "member", "viewer"]),
});