"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setPending(true);
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) {
        setError("We couldn't send the reset link. Check the address and try again.");
        return;
      }
      setMessage("If an account uses this address, a reset link is on its way.");
    } catch {
      setError("We couldn't reach the service. Try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Account recovery</p>
        <h1>Reset your password</h1>
        <p className="muted">We&apos;ll email you a link to choose a new password.</p>
      </div>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>Email address</span>
          <input autoComplete="email" name="email" type="email" required maxLength={254} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="field-hint" role="status">{message}</p>}
        <button className="button button-primary button-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="auth-switch">
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </div>
  );
}
