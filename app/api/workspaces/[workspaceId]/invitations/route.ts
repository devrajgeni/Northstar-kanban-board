import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../../lib/auth";
import { apiError, createInvitationSchema, resourceIdSchema } from "../../../../../lib/contracts";
import { createAndSendInvitation } from "../../../../../lib/invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { workspaceId: string } }) {
  const email = (await getServerSession(authOptions))?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  if (!resourceIdSchema.safeParse(params.workspaceId).success) return NextResponse.json(apiError("Invalid workspace ID", "INVALID_WORKSPACE_ID"), { status: 400 });
  const parsed = createInvitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid invitation input", "INVALID_INVITATION_INPUT"), { status: 400 });

  try {
    const result = await createAndSendInvitation(email, params.workspaceId, parsed.data);
    if (result.kind === "forbidden") return NextResponse.json(apiError("Only owners and admins can invite people", "INVITATION_FORBIDDEN"), { status: 403 });
    if (result.kind === "not_found") return NextResponse.json(apiError("Workspace not found", "WORKSPACE_NOT_FOUND"), { status: 404 });
    if (result.kind === "email_unavailable") return NextResponse.json(apiError("Email delivery is not configured", "EMAIL_NOT_CONFIGURED"), { status: 503 });
    return NextResponse.json({ invitationId: result.invitationId }, { status: 201 });
  } catch (error) {
    console.error("Unable to send invitation", error);
    return NextResponse.json(apiError("Unable to send invitation email", "INVITATION_DELIVERY_FAILED"), { status: 503 });
  }
}