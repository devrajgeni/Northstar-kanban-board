"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl,
    });
    setIsSubmitting(false);

    if (!result || result.error) {
      // Deliberately generic: don't reveal whether the email or password was wrong.
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  function handleMicrosoftSignIn() {
    setIsMicrosoftLoading(true);
    signIn("azure-ad", { callbackUrl });
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-showcase" aria-label="Northstar workspace overview">
          <div className="login-brand login-brand-light">
            <div className="brand-mark"><Sparkles size={17} /></div>
            <span>northstar</span>
          </div>
          <div className="showcase-copy">
            <span className="showcase-kicker">YOUR WORK, IN MOTION</span>
            <h1>Find clarity in the work that matters.</h1>
            <p>One calm place for your team&apos;s projects, decisions, and next moves.</p>
          </div>
          <div className="showcase-board" aria-hidden="true">
            <div className="showcase-board-head"><span>Website refresh</span><ArrowUpRight size={16} /></div>
            <div className="showcase-progress"><span /><i /></div>
            <div className="showcase-task"><span className="showcase-dot coral" /><div><strong>Map the onboarding journey</strong><small>Today</small></div><CheckCircle2 size={16} /></div>
            <div className="showcase-task"><span className="showcase-dot blue" /><div><strong>Build settings navigation</strong><small>In progress</small></div><div className="showcase-avatar">MP</div></div>
            <div className="showcase-task showcase-task-fade"><span className="showcase-dot mint" /><div><strong>Review analytics events</strong><small>Next up</small></div></div>
          </div>
          <p className="showcase-footer"><ShieldCheck size={15} /> Secure workspace access</p>
        </section>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-mobile-brand">
            <div className="brand-mark"><Sparkles size={17} /></div>
            <span>northstar</span>
          </div>
          <div className="login-heading">
            <span>WELCOME BACK</span>
            <h1 id="login-title">Sign in to your workspace</h1>
            <p>Use your workspace credentials or company account.</p>
          </div>
          <div className="login-sso">
            <span>COMPANY ACCESS</span>
            <button
              type="button"
              className="microsoft-button"
              onClick={handleMicrosoftSignIn}
              disabled={isMicrosoftLoading}
            >
              <MicrosoftLogo />
              {isMicrosoftLoading ? "Redirecting..." : "Continue with Microsoft"}
            </button>
          </div>
          <div className="login-divider"><span>or sign in with email</span></div>

          <form onSubmit={handleCredentialsSubmit} noValidate>
            <label>
              Email
              <input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="add-button login-submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
              {!isSubmitting && <ArrowUpRight size={16} />}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
