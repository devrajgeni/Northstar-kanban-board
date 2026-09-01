"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const callbackUrl = `/invitations/accept?token=${encodeURIComponent(token ?? "")}`;

  async function acceptInvitation() {
    if (!token) { setMessage("This invitation link is invalid."); return; }
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json() as { error?: string; workspace?: { name: string } };
      if (!response.ok) { setMessage(data.error ?? "Unable to accept invitation."); return; }
      setMessage(`You joined ${data.workspace?.name ?? "the workspace"}. You can now open your board.`);
    } catch { setMessage("Unable to accept invitation. Please try again."); } finally { setIsSubmitting(false); }
  }

  return <main className="login-page"><section className="login-card" aria-labelledby="accept-invitation-title"><div className="login-heading"><span>WORKSPACE INVITATION</span><h1 id="accept-invitation-title">Join your team</h1><p>Sign in with the email address that received this invitation, then accept it.</p></div>{message && <p className="form-error" role="alert">{message}</p>}<button className="add-button login-submit" onClick={acceptInvitation} disabled={isSubmitting || !token}>{isSubmitting ? "Joining..." : "Accept invitation"}</button><Link className="person-action" href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in with invited email</Link></section></main>;
}

export default function AcceptInvitationPage() {
  return <Suspense fallback={null}><AcceptInvitationContent /></Suspense>;
}