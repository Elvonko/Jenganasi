import { AuthForm } from "@/components/auth-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturnTo =
    returnTo && /^\/client-invitations\/[a-f0-9]{64}$/.test(returnTo)
      ? returnTo
      : undefined;
  return <AuthForm mode="sign-up" returnTo={safeReturnTo} />;
}
