import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";
import { apiError, resourceIdSchema, updateTaskSchema } from "../../../../lib/contracts";
import { deleteTaskForUser, updateTaskForUser } from "../../../../lib/tasks";

export const dynamic = "force-dynamic";

async function emailForRequest() {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase() ?? null;
}

export async function PATCH(request: Request, { params }: { params: { taskId: string } }) {
  const email = await emailForRequest();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.taskId).success) return NextResponse.json(apiError("Invalid task ID", "INVALID_TASK_ID"), { status: 400 });
  const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid task input", "INVALID_TASK_INPUT"), { status: 400 });
  const result = await updateTaskForUser(email, params.taskId, parsed.data);
  if (result.kind === "forbidden") return NextResponse.json(apiError("You cannot update this task", "TASK_UPDATE_FORBIDDEN"), { status: 403 });
  if (result.kind === "not_found") return NextResponse.json(apiError("Task not found", "TASK_NOT_FOUND"), { status: 404 });
  if (result.kind === "conflict") return NextResponse.json(apiError("Task was updated by another user", "TASK_VERSION_CONFLICT"), { status: 409 });
  return NextResponse.json({ task: result.task });
}

export async function DELETE(_request: Request, { params }: { params: { taskId: string } }) {
  const email = await emailForRequest();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.taskId).success) return NextResponse.json(apiError("Invalid task ID", "INVALID_TASK_ID"), { status: 400 });
  const result = await deleteTaskForUser(email, params.taskId);
  if (result.kind === "forbidden") return NextResponse.json(apiError("You cannot delete this task", "TASK_DELETE_FORBIDDEN"), { status: 403 });
  if (result.kind === "not_found") return NextResponse.json(apiError("Task not found", "TASK_NOT_FOUND"), { status: 404 });
  return new NextResponse(null, { status: 204 });
}