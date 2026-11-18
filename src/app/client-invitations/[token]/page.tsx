import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientInvitationAcceptForm } from "@/app/client-invitations/[token]/accept-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getSessionUser } from "@/lib/company-context";

export const dynamic = "force-dynamic";

export default async function ClientInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const user = await getSessionUser();
  const returnTo = `/client-invitations/${token}`;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-heading">
          <p className="eyebrow">PROJECT INVITATION</p>
          <h1>View project progress.</h1>
          <p className="muted">
            Sign in with the email address this invitation was sent to. The
            project team controls which updates are visible to you.
          </p>
        </div>
        {user ? (
          <>
            <div className="client-invitation-account">
              <span>Signed in as {user.email}</span>
              <SignOutButton
                redirectTo={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
              />
            </div>
            <ClientInvitationAcceptForm token={token} />
          </>
        ) : (
          <div className="form-stack">
            <Link
              className="button button-primary button-full"
              href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
            >
              Sign in to accept
            </Link>
            <Link
              className="button button-secondary button-full"
              href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`}
            >
              Create a client account
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
