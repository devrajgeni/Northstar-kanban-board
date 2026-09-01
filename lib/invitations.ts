import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";
import type { z } from "zod";
import { createInvitationSchema } from "./contracts";
import { getDatabase } from "./database";

type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
type InvitationRow = { id: string; workspace_name: string };

export type CreateInvitationResult =
  | { kind: "created"; invitationId: string }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "email_unavailable" };

export async function createAndSendInvitation(email: string, workspaceId: string, input: CreateInvitationInput): Promise<CreateInvitationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { kind: "email_unavailable" };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sql = getDatabase();
  const rows = await sql`
    WITH inviter AS (
      SELECT users.id AS user_id, workspace_memberships.role, workspaces.name AS workspace_name
      FROM workspace_memberships
      INNER JOIN users ON users.id = workspace_memberships.user_id
      INNER JOIN workspaces ON workspaces.id = workspace_memberships.workspace_id
      WHERE workspace_memberships.workspace_id = ${workspaceId}::uuid AND users.email = ${email.trim().toLowerCase()}
      LIMIT 1
    ), invitation AS (
      INSERT INTO workspace_invitations (workspace_id, email, role, token_hash, invited_by_user_id, expires_at)
      SELECT ${workspaceId}::uuid, ${input.email.toLowerCase()}, ${input.role}, ${tokenHash}, user_id, NOW() + INTERVAL '7 days'
      FROM inviter WHERE role IN ('owner', 'admin')
      RETURNING id
    )
    SELECT invitation.id, inviter.workspace_name FROM invitation CROSS JOIN inviter
  ` as InvitationRow[];
  if (!rows[0]) {
    const exists = await sql`SELECT 1 FROM workspaces WHERE id = ${workspaceId}::uuid LIMIT 1`;
    return exists[0] ? { kind: "forbidden" } : { kind: "not_found" };
  }

  const applicationUrl = process.env.NEXTAUTH_URL;
  if (!applicationUrl) return { kind: "email_unavailable" };
  const acceptUrl = `${applicationUrl}/invitations/accept?token=${encodeURIComponent(token)}`;
  const delivery = await new Resend(apiKey).emails.send({
    from,
    to: input.email.toLowerCase(),
    subject: `You are invited to ${rows[0].workspace_name} on Northstar`,
    text: `You were invited to join ${rows[0].workspace_name} as a ${input.role}. Accept the invitation: ${acceptUrl}`,
  });

  if (delivery.error) throw new Error(delivery.error.message);
  await sql`
    INSERT INTO audit_events (workspace_id, actor_user_id, event_type, entity_type, entity_id)
    SELECT ${workspaceId}::uuid, users.id, 'workspace.invitation_sent', 'workspace_invitation', ${rows[0].id}::uuid
    FROM users WHERE users.email = ${email.trim().toLowerCase()}
  `;
  return { kind: "created", invitationId: rows[0].id };
}

export async function acceptInvitationForUser(email: string, token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sql = getDatabase();
  const rows = await sql`
    WITH invitation AS (
      SELECT workspace_invitations.id, workspace_invitations.workspace_id, workspace_invitations.role, users.id AS user_id
      FROM workspace_invitations
      INNER JOIN users ON users.email = ${email.trim().toLowerCase()}
      WHERE workspace_invitations.token_hash = ${tokenHash}
        AND workspace_invitations.email = ${email.trim().toLowerCase()}
        AND workspace_invitations.accepted_at IS NULL
        AND workspace_invitations.expires_at > NOW()
      LIMIT 1
    ), membership AS (
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      SELECT workspace_id, user_id, role FROM invitation
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
      RETURNING workspace_id, user_id
    ), accepted AS (
      UPDATE workspace_invitations SET accepted_at = NOW()
      WHERE id = (SELECT id FROM invitation)
      RETURNING id, workspace_id
    ), audit AS (
      INSERT INTO audit_events (workspace_id, actor_user_id, event_type, entity_type, entity_id)
      SELECT accepted.workspace_id, membership.user_id, 'workspace.invitation_accepted', 'workspace_invitation', accepted.id
      FROM accepted CROSS JOIN membership
    )
    SELECT workspaces.id, workspaces.name FROM accepted INNER JOIN workspaces ON workspaces.id = accepted.workspace_id
  ` as { id: string; name: string }[];
  return rows[0] ? { kind: "accepted" as const, workspace: rows[0] } : { kind: "invalid" as const };
}