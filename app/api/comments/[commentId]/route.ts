import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";
import { apiError, resourceIdSchema, updateCommentSchema } from "../../../../lib/contracts";
import { deleteCommentForUser, updateCommentForUser } from "../../../../lib/tasks";

export const dynamic = "force-dynamic";
async function emailForRequest() { return (await getServerSession(authOptions))?.user?.email?.toLowerCase() ?? null; }

export async function PATCH(request: Request, { params }: { params: { commentId: string } }) {
  const email = await emailForRequest();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.commentId).success) return NextResponse.json(apiError("Invalid comment ID", "INVALID_COMMENT_ID"), { status: 400 });
  const parsed = updateCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid comment input", "INVALID_COMMENT_INPUT"), { status: 400 });
  const result = await updateCommentForUser(email, params.commentId, parsed.data.body);
  if (result.kind === "forbidden") return NextResponse.json(apiError("You cannot edit this comment", "COMMENT_UPDATE_FORBIDDEN"), { status: 403 });
  if (result.kind === "not_found") return NextResponse.json(apiError("Comment not found", "COMMENT_NOT_FOUND"), { status: 404 });
  return NextResponse.json({ comment: result.comment });
}

export async function DELETE(_request: Request, { params }: { params: { commentId: string } }) {
  const email = await emailForRequest();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.commentId).success) return NextResponse.json(apiError("Invalid comment ID", "INVALID_COMMENT_ID"), { status: 400 });
  const result = await deleteCommentForUser(email, params.commentId);
  if (result.kind === "forbidden") return NextResponse.json(apiError("You cannot delete this comment", "COMMENT_DELETE_FORBIDDEN"), { status: 403 });
  if (result.kind === "not_found") return NextResponse.json(apiError("Comment not found", "COMMENT_NOT_FOUND"), { status: 404 });
  return new NextResponse(null, { status: 204 });
}