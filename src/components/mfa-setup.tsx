"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function MfaSetup({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function begin() {
    setError("");
    const result = await authClient.twoFactor.enable({ password: undefined, method: "totp" });
    if (result.error) {
      setError("We couldn't start MFA setup. Check your details and try again.");
      return;
    }
    const totp = await authClient.twoFactor.getTotpUri({});
    if (totp.data?.totpURI) setUri(totp.data.totpURI);
    setMessage("Scan the code with your authenticator app, then enter a 6-digit code to confirm.");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const result = await authClient.twoFactor.verifyTotp({ code });
    if (result.error) {
      setError("That code didn't match. Check the time on your device and try again.");
      return;
    }
    setEnabled(true);
    setUri("");
    setCode("");
    setMessage("Two-factor authentication is now enabled.");
    router.refresh();
  }

  async function disable() {
    setError("");
    const result = await authClient.twoFactor.disable({});
    if (result.error) {
      setError("We couldn't disable MFA. Try again.");
      return;
    }
    setEnabled(false);
    setMessage("Two-factor authentication has been disabled.");
    router.refresh();
  }

  return (
    <div className="form-stack" style={{ padding: "0 21px 21px" }}>
      <p className="field-hint">
        Status: <strong>{enabled ? "Enabled" : "Not enabled"}</strong>
      </p>
      {enabled ? (
        <button className="button button-secondary" onClick={disable} type="button">
          Disable two-factor authentication
        </button>
      ) : (
        <>
          <button className="button button-primary" onClick={begin} type="button">
            Set up authenticator app
          </button>
          {uri && (
            <>
              <p className="field-hint">
                Add this secret to your authenticator app: <code>{uri.split("?secret=")[1]?.split("&")[0]}</code>
              </p>
              <form className="form-stack" onSubmit={verify}>
                <label className="field">
                  <span>6-digit code</span>
                  <input
                    inputMode="numeric"
                    name="code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
                <button className="button button-primary" type="submit">
                  Confirm and enable
                </button>
              </form>
            </>
          )}
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="field-hint" role="status">{message}</p>}
    </div>
  );
}
