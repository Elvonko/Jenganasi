"use client";

import { useActionState } from "react";
import {
  createClientProjectInvitation,
  removeClientProjectAccessAction,
  revokeClientInvitationAction,
} from "@/app/projects/media-actions";
import type {
  ClientInvitationItem,
  ProjectClientAccessItem,
} from "@/lib/project-media-service";
import { useState } from "react";

export function ClientProjectAccessPanel({
  projectId,
  customerEmail,
  clients,
  invitations,
}: {
  projectId: string;
  customerEmail: string | null;
  clients: ProjectClientAccessItem[];
  invitations: ClientInvitationItem[];
}) {
  const [state, formAction, pending] = useActionState(
    createClientProjectInvitation,
    {},
  );
  const [copyMessage, setCopyMessage] = useState("");

  async function copyInvitation() {
    if (!state.invitationUrl) return;
    try {
      await navigator.clipboard.writeText(state.invitationUrl);
      setCopyMessage("Invitation link copied.");
    } catch (error) {
      if (error instanceof Error) {
        setCopyMessage("Select and copy the invitation link to share it.");
        return;
      }
      throw error;
    }
  }

  return (
    <section className="panel client-access-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h2>Client access</h2>
          <p className="muted">
            Invite the customer linked to this project. They can view only the
            progress updates you share.
          </p>
        </div>
      </div>
      <form action={formAction} className="client-invite-form">
        <input type="hidden" name="projectId" value={projectId} />
        <div>
          <strong>{customerEmail ?? "No customer email available"}</strong>
          <span className="field-hint">
            {customerEmail
              ? "The secure invitation is restricted to this email address and expires in 7 days."
              : "Link this project to a customer with an email address to invite them."}
          </span>
        </div>
        <button
          className="button button-secondary"
          disabled={pending || !customerEmail}
          type="submit"
        >
          {pending ? "Creating link…" : "Create invitation link"}
        </button>
      </form>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.invitationUrl && (
        <div className="client-invitation-result">
          <label className="field">
            <span>Share this one-time invitation link</span>
            <input readOnly value={state.invitationUrl} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <button className="button button-tertiary" onClick={copyInvitation} type="button">
            Copy link
          </button>
          <span className="field-hint" aria-live="polite">{copyMessage}</span>
        </div>
      )}
      {invitations.length > 0 && (
        <div className="client-access-list">
          <strong>
            Pending invitations <span className="work-count">{invitations.length}</span>
          </strong>
          <ul>
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <span>
                  <strong>{invitation.email}</strong>
                  <small>
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </small>
                </span>
                <form action={revokeClientInvitationAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="invitationId" value={invitation.id} />
                  <button
                    className="button button-tertiary"
                    type="submit"
                    aria-label={`Revoke invitation for ${invitation.email}`}
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="client-access-list">
        <strong>People with access <span className="work-count">{clients.length}</span></strong>
        {clients.length === 0 ? (
          <p className="work-empty">No client accounts have accepted an invitation yet.</p>
        ) : (
          <ul>
            {clients.map((client) => (
              <li key={client.id}>
                <span>
                  <strong>{client.name}</strong>
                  <small>{client.email}</small>
                </span>
                <form action={removeClientProjectAccessAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="accessId" value={client.id} />
                  <button
                    className="button button-tertiary"
                    type="submit"
                    aria-label={`Remove ${client.name}'s access`}
                  >
                    Remove access
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
