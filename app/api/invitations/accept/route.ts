import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";
import { acceptInvitationSchema, apiError } from "../../../../lib/contracts";
import { acceptInvitationForUser } from "../../../../lib/invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const email = (await getServerSession(authOptions))?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Sign in with the invited email address", "UNAUTHORIZED"), { status: 401 });
  const parsed = acceptInvitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid invitation link", "INVALID_INVITATION_TOKEN"), { status: 400 });
  try {
    const result = await acceptInvitationForUser(email, parsed.data.token);
    if (result.kind === "invalid") return NextResponse.json(apiError("This invitation is invalid, expired, already accepted, or belongs to another email", "INVITATION_NOT_AVAILABLE"), { status: 404 });
    return NextResponse.json({ workspace: result.workspace });
  } catch (error) {
    console.error("Unable to accept invitation", error);
    return NextResponse.json(apiError("Unable to accept invitation", "INVITATION_ACCEPTANCE_FAILED"), { status: 503 });
  }
}