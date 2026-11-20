import { redirect } from "next/navigation";
import { MfaSetup } from "@/components/mfa-setup";
import { getCompanyContext } from "@/lib/company-context";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const { actor } = await getCompanyContext();
  if (actor.role !== "owner" && actor.role !== "admin") {
    redirect("/forbidden");
  }

  const session = await auth.api.getSession({
    headers: await import("next/headers").then((mod) => mod.headers()),
  });
  const enabled = Boolean(session?.user.twoFactorEnabled);

  return (
    <div className="page-stack narrow-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SECURITY</p>
            <h1>Two-factor authentication</h1>
            <p className="muted">
              Add an extra layer of protection using an authenticator app. Owner
              and admin accounts are required to enrol.
            </p>
          </div>
        </div>
        <MfaSetup initiallyEnabled={enabled} />
      </section>
    </div>
  );
}
