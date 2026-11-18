import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="standalone-message">
      <span className="eyebrow">Access restricted</span>
      <h1>This workspace isn’t available to your role.</h1>
      <p className="muted">
        Ask your company administrator if you need access to this area.
      </p>
      <Link className="button button-secondary" href="/overview">
        Return to overview
      </Link>
    </main>
  );
}
