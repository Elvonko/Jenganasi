"use client";

import { useSearchParams } from "next/navigation";
import type { HelpAudience } from "@/lib/help-content";

export function HelpAudienceSwitcher({
  current,
}: {
  current: HelpAudience;
}) {
  const returnTo = useSearchParams().get("returnTo");

  function href(audience: HelpAudience) {
    const params = new URLSearchParams({ audience });
    if (returnTo) params.set("returnTo", returnTo);
    return `/help?${params.toString()}`;
  }

  return (
    <div className="help-audience-switcher" role="group" aria-label="Choose help topic">
      {(["contractor", "customer"] as const).map((audience) => (
        <a
          key={audience}
          className={`help-audience-tab${current === audience ? " help-audience-tab-active" : ""}`}
          href={href(audience)}
          aria-current={current === audience ? "page" : undefined}
        >
          {audience === "contractor" ? "Contractors & staff" : "Customers & clients"}
        </a>
      ))}
    </div>
  );
}
