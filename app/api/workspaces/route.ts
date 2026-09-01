import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/auth";
import { apiError } from "../../../lib/contracts";
import { ensureWorkspaceForUser, listWorkspacesForUser } from "../../../lib/workspaces";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });

  try {
    await ensureWorkspaceForUser(email, session?.user?.name ?? email.split("@")[0]);
    const workspaces = await listWorkspacesForUser(email);
    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Unable to provision workspaces", error);
    return NextResponse.json(apiError("Unable to load workspaces", "WORKSPACES_UNAVAILABLE"), { status: 503 });
  }
}