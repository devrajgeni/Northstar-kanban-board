import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../../lib/auth";
import { apiError, createTaskSchema, resourceIdSchema } from "../../../../../lib/contracts";
import { createTaskForUser } from "../../../../../lib/tasks";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.projectId).success) return NextResponse.json(apiError("Invalid project ID", "INVALID_PROJECT_ID"), { status: 400 });

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid task input", "INVALID_TASK_INPUT"), { status: 400 });
  if (parsed.data.assigneeIds.length || parsed.data.labelIds.length) {
    return NextResponse.json(apiError("Assignments and labels are not available yet", "TASK_ASSOCIATIONS_UNAVAILABLE"), { status: 422 });
  }

  try {
    const result = await createTaskForUser(email, params.projectId, parsed.data);
    if (result.kind === "forbidden") return NextResponse.json(apiError("You cannot create tasks in this project", "TASK_CREATE_FORBIDDEN"), { status: 403 });
    if (result.kind === "invalid_column") return NextResponse.json(apiError("Column not found in project", "COLUMN_NOT_FOUND"), { status: 404 });
    if (result.kind === "not_found") return NextResponse.json(apiError("Project not found", "PROJECT_NOT_FOUND"), { status: 404 });
    return NextResponse.json({ task: result.task }, { status: 201 });
  } catch (error) {
    console.error("Unable to create task", error);
    return NextResponse.json(apiError("Unable to create task", "TASK_CREATE_UNAVAILABLE"), { status: 503 });
  }
}