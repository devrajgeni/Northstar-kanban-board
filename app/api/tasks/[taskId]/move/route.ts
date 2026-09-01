import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../../lib/auth";
import { apiError, moveTaskSchema, resourceIdSchema } from "../../../../../lib/contracts";
import { moveTaskForUser } from "../../../../../lib/tasks";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  const email = (await getServerSession(authOptions))?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.taskId).success) return NextResponse.json(apiError("Invalid task ID", "INVALID_TASK_ID"), { status: 400 });
  const parsed = moveTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid move input", "INVALID_TASK_MOVE"), { status: 400 });
  const result = await moveTaskForUser(email, params.taskId, parsed.data.columnId, parsed.data.version);
  if (result.kind === "forbidden") return NextResponse.json(apiError("You cannot move this task", "TASK_MOVE_FORBIDDEN"), { status: 403 });
  if (result.kind === "not_found") return NextResponse.json(apiError("Task not found", "TASK_NOT_FOUND"), { status: 404 });
  if (result.kind === "conflict") return NextResponse.json(apiError("Task changed or target column is invalid", "TASK_MOVE_CONFLICT"), { status: 409 });
  return NextResponse.json({ task: result.task });
}