import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../../lib/auth";
import { apiError, createCommentSchema, resourceIdSchema } from "../../../../../lib/contracts";
import { createCommentForUser } from "../../../../../lib/tasks";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  const email = (await getServerSession(authOptions))?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.taskId).success) return NextResponse.json(apiError("Invalid task ID", "INVALID_TASK_ID"), { status: 400 });
  const parsed = createCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid comment input", "INVALID_COMMENT_INPUT"), { status: 400 });
  const result = await createCommentForUser(email, params.taskId, parsed.data.body);
  if (result.kind === "forbidden") return NextResponse.json(apiError("You cannot comment on this task", "COMMENT_CREATE_FORBIDDEN"), { status: 403 });
  if (result.kind === "not_found") return NextResponse.json(apiError("Task not found", "TASK_NOT_FOUND"), { status: 404 });
  return NextResponse.json({ comment: result.comment }, { status: 201 });
}