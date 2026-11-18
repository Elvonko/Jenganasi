"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startMpesaCheckout,
  type CheckoutFormState,
} from "@/lib/billing-actions";

export function MpesaCheckoutForm({
  planId,
  planName,
  amountKes,
}: {
  planId: string;
  planName: string;
  amountKes: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CheckoutFormState, FormData>(
    startMpesaCheckout,
    {},
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!state.checkoutRequestId) return;
    let attempts = 0;

    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/mpesa/status?checkoutRequestId=${encodeURIComponent(state.checkoutRequestId!)}`,
        );
        if (!response.ok) return;
        const result = (await response.json()) as {
          status: string;
          resultDesc?: string;
        };
        if (result.status === "success") {
          setStatus("Payment received. Your plan is now active.");
          clearInterval(timer);
          router.refresh();
          return;
        }
        if (result.status === "failed" || result.status === "cancelled") {
          setStatus(result.resultDesc ?? "The payment was not completed.");
          clearInterval(timer);
          return;
        }
        if (attempts >= 20) {
          setStatus("Still waiting for payment. Refresh this page to check again.");
          clearInterval(timer);
        }
      } catch {
        // Keep polling; transient failures are expected while the PIN prompt is open.
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [state.checkoutRequestId, router]);

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="planId" value={planId} />
      <label className="field">
        <span>M-Pesa phone number</span>
        <input
          name="phoneNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="0712345678"
          pattern="(0|254|\+254)?[0-9]{9,12}"
          required
        />
        <small className="field-hint">
          We&apos;ll send an STK push to this number. Amount: KES {amountKes}.
        </small>
      </label>
      <label className="remember-me">
        <input name="autoRenew" type="checkbox" />
        <span>
          <span className="remember-me-label">Renew automatically next year</span>
          <small className="field-hint">
            You&apos;ll get an STK push before your plan expires. You can turn this off anytime.
          </small>
        </span>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {(status || state.checkoutRequestId) && (
        <p className="field-hint" role="status">
          {status || "Check your phone for the M-Pesa PIN prompt…"}
        </p>
      )}
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Starting payment…" : `Pay KES ${amountKes} with M-Pesa`}
      </button>
      <span className="field-hint">Plan: {planName}</span>
    </form>
  );
}
