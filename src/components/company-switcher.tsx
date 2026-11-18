import { Check, ChevronsUpDown } from "lucide-react";
import { switchActiveCompany } from "@/lib/company-context";

type CompanySwitcherProps = {
  activeCompanyId: string;
  companies: Array<{
    companyId: string;
    companyName: string;
  }>;
};

export function CompanySwitcher({
  activeCompanyId,
  companies,
}: CompanySwitcherProps) {
  if (companies.length === 1) {
    return (
      <div className="company-switcher company-switcher-single">
        <span>{companies[0].companyName}</span>
        <Check size={16} className="company-check" aria-hidden="true" />
      </div>
    );
  }

  return (
    <form action={switchActiveCompany} className="company-switcher">
      <label className="sr-only" htmlFor="active-company">
        Active company
      </label>
      <select
        id="active-company"
        name="companyId"
        defaultValue={activeCompanyId}
        aria-label="Active company"
      >
        {companies.map((company) => (
          <option key={company.companyId} value={company.companyId}>
            {company.companyName}
          </option>
        ))}
      </select>
      {companies.length > 1 ? (
        <button
          className="icon-button switch-company-button"
          type="submit"
          aria-label="Switch company"
          title="Switch company"
        >
          <ChevronsUpDown size={16} aria-hidden="true" />
        </button>
      ) : (
        <Check size={16} className="company-check" aria-hidden="true" />
      )}
    </form>
  );
}
