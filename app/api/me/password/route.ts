import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";
import { apiError, changePasswordSchema } from "../../../../lib/contracts";
import { changeUserPassword } from "../../../../lib/credentials";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const email = (await getServerSession(authOptions))?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(apiError("Invalid password input", "INVALID_PASSWORD_INPUT"), { status: 400 });
  const changed = await changeUserPassword(email, parsed.data.currentPassword, parsed.data.nextPassword);
  if (!changed) return NextResponse.json(apiError("Current password is incorrect", "CURRENT_PASSWORD_INCORRECT"), { status: 400 });
  return new NextResponse(null, { status: 204 });
}