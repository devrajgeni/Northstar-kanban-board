import { z } from "zod";

const assigneeSchema = z.object({
  name: z.string().min(1).max(120),
  initials: z.string().min(1).max(8),
  color: z.string().min(1).max(40),
});

const commentSchema = z.object({
  id: z.number().int().positive(),
  author: z.string().min(1).max(120),
  date: z.string().min(1).max(60),
  text: z.string().min(1).max(10_000),
});

export const boardStateSchema = z.object({
  tasks: z.array(z.object({
    id: z.number().int().positive(),
    team: z.string().min(1).max(120),
    project: z.string().min(1).max(160),
    title: z.string().min(1).max(500),
    description: z.string().max(10_000),
    status: z.enum(["backlog", "progress", "review", "done"]),
    priority: z.enum(["High", "Medium", "Low"]),
    due: z.string().min(1).max(60),
    labels: z.array(z.string().min(1).max(60)).max(30),
    assignee: z.string().min(1).max(120),
    initials: z.string().min(1).max(8),
    color: z.string().min(1).max(40),
    assignees: z.array(assigneeSchema).max(100),
    comments: z.array(commentSchema).max(1_000),
  })).max(10_000),
});