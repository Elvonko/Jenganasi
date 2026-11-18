import { redirect } from "next/navigation";
import { CompanySetupForm } from "@/components/company-setup-form";
import { getSessionUser } from "@/lib/company-context";

export const dynamic = "force-dynamic";

export default async function CompanySetupPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Your company workspace</p>
        <h1>Let’s set up your company.</h1>
        <p className="muted">
          This creates a private workspace for your team and projects.
        </p>
      </div>
      <CompanySetupForm />
    </div>
  );
}
