import {
  ArrowUpRight,
  HardHat,
} from "lucide-react";
import Link from "next/link";
import { getCompanyContext } from "@/lib/company-context";
import { hasPermission } from "@/lib/permissions";
import { BrandLogo } from "@/components/brand-logo";
import { CompanySwitcher } from "@/components/company-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceNavigation } from "@/components/workspace-navigation";

export async function WorkspaceShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await getCompanyContext();

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand-lockup" href="/overview" aria-label="JengaNasi workspace overview">
          <BrandLogo />
        </Link>
        <div className="sidebar-company">
          <span className="sidebar-label">WORKSPACE</span>
          <CompanySwitcher
            activeCompanyId={context.company.id}
            companies={context.memberships.map((membership) => ({
              companyId: membership.companyId,
              companyName: membership.companyName,
            }))}
          />
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          <span className="sidebar-label">WORKSPACE</span>
          <WorkspaceNavigation
            canReadEstimates={hasPermission(context.actor.role, "estimates:read")}
            canReadCustomers={hasPermission(context.actor.role, "customers:read")}
            canReadReports={hasPermission(context.actor.role, "reports:read")}
            canReadAccounts={hasPermission(context.actor.role, "accounts:read")}
            canReadProcurement={hasPermission(context.actor.role, "procurement:read")}
            canReadSettings={hasPermission(context.actor.role, "settings:read")}
            canManageBilling={hasPermission(context.actor.role, "settings:update")}
          />
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <HardHat size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>Built for the site</strong>
              <span>Clear work, from ground up.</span>
            </div>
            <ArrowUpRight size={15} aria-hidden="true" />
          </div>
          <div className="sidebar-user">
            <span className="avatar">
              {context.user.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="user-copy">
              <strong>{context.user.name}</strong>
              <span>{context.user.email}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-company">{context.company.name}</span>
            <span className="topbar-divider">/</span>
            <span>{context.company.currencyCode}</span>
          </div>
          <span className="secure-label">
            <span className="secure-dot" />
            Private workspace
          </span>
          <div className="mobile-sign-out">
            <SignOutButton />
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
