import Link from "next/link";

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
          <span className="brand-mark" aria-hidden="true">J</span>
          <span className="brand-name">Jenga<span>Nasi</span></span>
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
