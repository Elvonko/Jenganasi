"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptClientProjectInvitation } from "@/app/projects/media-actions";

export function ClientInvitationAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    acceptClientProjectInvitation,
    {},
  );

  useEffect(() => {
    if (state.success) router.push("/client-portal");
  }, [router, state.success]);

  return (
    <form action={formAction} className="form-stack">
      <input name="token" type="hidden" value={token} />
      <p className="muted">
        Accept the invitation to see progress updates the project team has shared.
      </p>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-primary button-full" disabled={pending}>
        {pending ? "Joining project…" : "Accept invitation"}
      </button>
    </form>
  );
}
