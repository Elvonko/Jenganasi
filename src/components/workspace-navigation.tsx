"use client";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Settings2,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type WorkspaceNavigationProps = {
  canReadEstimates: boolean;
  canReadCustomers: boolean;
  canReadReports: boolean;
  canReadAccounts: boolean;
  canReadProcurement: boolean;
  canReadSettings: boolean;
  canManageBilling: boolean;
};

export function WorkspaceNavigation({
  canReadEstimates,
  canReadCustomers,
  canReadReports,
  canReadAccounts,
  canReadProcurement,
  canReadSettings,
  canManageBilling,
}: WorkspaceNavigationProps) {
  const pathname = usePathname();
  const navigation = [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    ...(canReadCustomers
      ? [{ href: "/customers", label: "Customers", icon: Users }]
      : []),
    ...(canReadEstimates
      ? [{ href: "/estimates", label: "Estimates & BOQ", icon: ClipboardList }]
      : []),
    ...(canReadProcurement
      ? [{ href: "/procurement", label: "Procurement", icon: Boxes }]
      : []),
    ...(canReadReports
      ? [{ href: "/reports", label: "Reports", icon: BarChart3 }]
      : []),
    ...(canReadAccounts
      ? [{ href: "/accounts", label: "Accounts", icon: UsersRound }]
      : []),
    ...(canReadSettings
      ? [{ href: "/settings", label: "Settings", icon: Settings2 }]
      : []),
    ...(canManageBilling
      ? [{ href: "/billing", label: "Billing", icon: CreditCard }]
      : []),
  ];

  return navigation.map((item) => {
    const Icon = item.icon;
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        className="nav-link"
        href={item.href}
        key={item.href}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  });
}
