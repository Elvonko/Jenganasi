import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <span className="backdrop-grid" />
        <span className="backdrop-shape backdrop-shape-one" />
        <span className="backdrop-shape backdrop-shape-two" />
      </div>
      <header className="auth-brand-header">
        <Link className="brand-lockup" href="/" aria-label="JengaNasi">
          <BrandLogo />
        </Link>
        <span className="auth-header-note">Build with a clearer view.</span>
      </header>
      <div className="auth-content">{children}</div>
      <footer className="auth-footer">
        <span>JengaNasi</span>
        <span>Construction, in good company.</span>
      </footer>
    </main>
  );
}
