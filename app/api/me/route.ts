import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/auth";
import { apiError, updateProfileSchema } from "../../../lib/contracts";
import { getUserProfile, updateUserProfile } from "../../../lib/credentials";

export const dynamic = "force-dynamic";

async function sessionEmail() {
  return (await getServerSession(authOptions))?.user?.email?.toLowerCase() ?? null;
}

export async function GET() {
  const email = await sessionEmail();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  const profile = await getUserProfile(email);
  if (!profile) return NextResponse.json(apiError("Profile not found", "PROFILE_NOT_FOUND"), { status: 404 });
  return NextResponse.json({ profile: { email: profile.email, displayName: profile.display_name } });
}

export async function PATCH(request: Request) {
  const email = await sessionEmail();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  const parsed = updateProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid profile input", "INVALID_PROFILE_INPUT"), { status: 400 });
  const profile = await updateUserProfile(email, parsed.data.displayName);
  if (!profile) return NextResponse.json(apiError("Profile not found", "PROFILE_NOT_FOUND"), { status: 404 });
  return NextResponse.json({ profile: { email: profile.email, displayName: profile.display_name } });
}