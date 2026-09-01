import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../../lib/auth";
import { apiError, resourceIdSchema } from "../../../../../lib/contracts";
import { getBoardForWorkspace } from "../../../../../lib/workspaces";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { workspaceId: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.workspaceId).success) {
    return NextResponse.json(apiError("Invalid workspace ID", "INVALID_WORKSPACE_ID"), { status: 400 });
  }

  try {
    const board = await getBoardForWorkspace(email, params.workspaceId);
    if (!board) return NextResponse.json(apiError("Workspace not found", "WORKSPACE_NOT_FOUND"), { status: 404 });
    return NextResponse.json(board);
  } catch (error) {
    console.error("Unable to load workspace board", error);
    return NextResponse.json(apiError("Unable to load workspace board", "WORKSPACE_BOARD_UNAVAILABLE"), { status: 503 });
  }
}