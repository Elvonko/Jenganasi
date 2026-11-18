"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError("We couldn't reset your password. The link may have expired — request a new one.");
        return;
      }
      router.push("/sign-in?reset=1");
      router.refresh();
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
        <h1>Choose a new password</h1>
        <p className="muted">Use at least 12 characters.</p>
      </div>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>New password</span>
          <input
            autoComplete="new-password"
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-full" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
