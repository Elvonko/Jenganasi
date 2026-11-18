"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  returnTo?: string;
};

function getAuthFailureMessage(
  error: { code?: string | null; status?: number | null },
  mode: AuthFormProps["mode"],
) {
  if (error.status === 429 || error.code === "TOO_MANY_REQUESTS") {
    return "Too many attempts have been made. Wait a few minutes before trying again.";
  }

  if (error.status && error.status >= 500) {
    return "The authentication service is having trouble right now. Try again shortly. If the problem continues, contact your administrator.";
  }

  switch (error.code) {
    case "INVALID_EMAIL":
      return "Enter a valid email address, such as name@example.com.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account already uses this email address. Sign in instead, or use a different email address.";
    case "PASSWORD_TOO_SHORT":
      return "Your password must be at least 12 characters. Choose a longer password and try again.";
    case "PASSWORD_TOO_LONG":
      return "Your password must be no more than 128 characters. Shorten it and try again.";
    case "INVALID_EMAIL_OR_PASSWORD":
      return "We couldn't sign you in with those details. Check your email and password for typos, then try again. If you haven't registered yet, create an account.";
    case "EMAIL_NOT_VERIFIED":
      return "This email address hasn't been verified yet. Check your inbox for a verification link, then try again.";
    case "INVALID_ORIGIN":
    case "MISSING_OR_NULL_ORIGIN":
      return "This sign-in request was blocked because the site address could not be verified. Reload the page and try again; contact your administrator if it continues.";
    case "FAILED_TO_CREATE_USER":
      return "We couldn't create your account with the information provided. Check your details and try again. If the problem continues, contact your administrator.";
    case "FAILED_TO_CREATE_SESSION":
      return "Your details were accepted, but we couldn't start your session. Try signing in again. If the problem continues, contact your administrator.";
    default:
      return mode === "sign-up"
        ? "We couldn't create your account. Check your details and try again. If the problem continues, contact your administrator."
        : "We couldn't complete sign-in. Check your details and try again. If the problem continues, contact your administrator.";
  }
}

export function AuthForm({ mode, returnTo }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (mode === "sign-up" && !name) {
      setError("Enter your full name to create an account.");
      return;
    }

    const password = String(formData.get("password") ?? "");
    setPending(true);

    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({
              email,
              password,
              rememberMe: formData.get("rememberMe") === "on",
            });

      if (result.error) {
        setError(getAuthFailureMessage(result.error, mode));
        return;
      }

      router.push(returnTo ?? (mode === "sign-up" ? "/setup/company" : "/overview"));
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof TypeError
          ? "We couldn't reach the authentication service. Check your internet connection and try again."
          : mode === "sign-up"
            ? "We couldn't create your account because the request failed. Try again shortly. If the problem continues, contact your administrator."
            : "We couldn't complete sign-in because the request failed. Try again shortly. If the problem continues, contact your administrator.",
      );
    } finally {
      setPending(false);
    }
  }

  const signingUp = mode === "sign-up";

  return (
    <div className="auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">{signingUp ? "Start building" : "Welcome back"}</p>
        <h1>{signingUp ? "Create your account" : "Sign in to JengaNasi"}</h1>
        <p className="muted">
          {signingUp
            ? "Set up your workspace and bring your projects into one clear view."
            : "Pick up where your team left off."}
        </p>
      </div>

      <form className="form-stack" onSubmit={submit}>
        {signingUp && (
          <label className="field">
            <span>Full name</span>
            <input autoComplete="name" name="name" required maxLength={100} />
          </label>
        )}
        <label className="field">
          <span>Email address</span>
          <input
            autoComplete="email"
            name="email"
            type="email"
            required
            maxLength={254}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            autoComplete={signingUp ? "new-password" : "current-password"}
            name="password"
            type="password"
            required
            minLength={signingUp ? 12 : 1}
            maxLength={128}
          />
          {signingUp && (
            <small className="field-hint">Use at least 12 characters.</small>
          )}
        </label>
        {!signingUp && (
          <label className="remember-me">
            <input defaultChecked name="rememberMe" type="checkbox" />
            <span>
              <span className="remember-me-label">Keep me signed in on this device</span>
              <small className="field-hint">Stay signed in for up to 30 days.</small>
            </span>
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary button-full" disabled={pending}>
          {pending
            ? "Please wait…"
            : signingUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {!signingUp && (
        <p className="auth-switch">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      )}

      <p className="auth-switch">
        {signingUp ? "Already have an account?" : "New to JengaNasi?"}{" "}
        <Link
          href={`${signingUp ? "/sign-in" : "/sign-up"}${
            returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
          }`}
        >
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
