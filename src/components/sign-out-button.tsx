"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({
  redirectTo = "/sign-in",
}: {
  redirectTo?: string;
} = {}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(result.error.message ?? "Sign out failed. Please retry.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Sign out failed. Please retry.",
      );
    }
  }

  return (
    <>
      <button className="sign-out-button" onClick={signOut} type="button">
        <LogOut size={16} aria-hidden="true" />
        <span>Sign out</span>
      </button>
      {error && (
        <p className="form-error compact-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
