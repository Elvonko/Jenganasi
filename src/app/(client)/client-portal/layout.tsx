import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { getSessionUser } from "@/lib/company-context";

export const dynamic = "force-dynamic";

export default async function ClientPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="client-portal-shell">
      <header className="client-portal-header">
        <Link className="brand-lockup" href="/client-portal">
          <BrandLogo />
        </Link>
        <div className="client-portal-user">
          <Link className="client-help-link" href="/help?audience=customer&returnTo=/client-portal">
            Help &amp; guides
          </Link>
          <span>{user.name}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="client-portal-main">{children}</main>
    </div>
  );
}
