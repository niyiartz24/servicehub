import { LoginForm } from "./login-form";
import { brand } from "@/config/brand";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const notice =
    error === "no-client" ? "Your account is not linked to a client yet. Contact SynthaxLab."
    : error === "link-expired" ? "That link has expired. Use \"Forgot your password?\" to get a new one."
    : null;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-xl font-semibold">{brand.name}</p>
        <p className="mb-8 text-sm text-muted">by {brand.parent}</p>
        {notice && <p role="alert" className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{notice}</p>}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
