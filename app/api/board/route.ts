import { neon } from "@neondatabase/serverless";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { boardStateSchema } from "../../../lib/boardState";
import { authOptions } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  return neon(databaseUrl);
}

async function getOwnerKey(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase() ?? null;
}

export async function GET() {
  const ownerKey = await getOwnerKey();
  if (!ownerKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT tasks FROM user_board_states WHERE owner_key = ${ownerKey}
    ` as { tasks: unknown }[];
    return NextResponse.json({ tasks: rows[0]?.tasks ?? null });
  } catch (error) {
    console.error("Unable to load board state", error);
    return NextResponse.json({ error: "Unable to load board state" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const ownerKey = await getOwnerKey();
  if (!ownerKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = boardStateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid board state" }, { status: 400 });

  try {
    const sql = getDatabase();
    await sql`
      INSERT INTO user_board_states (owner_key, tasks)
      VALUES (${ownerKey}, ${JSON.stringify(parsed.data.tasks)}::jsonb)
      ON CONFLICT (owner_key)
      DO UPDATE SET tasks = EXCLUDED.tasks, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to save board state", error);
    return NextResponse.json({ error: "Unable to save board state" }, { status: 503 });
  }
}