import { loginAction } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold">Admin Login</h1>
      {error && (
        <p className="mt-2 text-sm text-red-600">Incorrect password.</p>
      )}
      <form action={loginAction} className="mt-4 space-y-3">
        <input
          type="password"
          name="password"
          aria-label="Password"
          placeholder="Password"
          required
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
        />
        <SubmitButton
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          pendingText="Logging in…"
        >
          Log in
        </SubmitButton>
      </form>
    </div>
  );
}
