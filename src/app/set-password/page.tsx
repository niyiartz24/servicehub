import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/form-fields";
import { setPassword } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Set password" };

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link-expired");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Choose a password</h1>
        <p className="mb-8 mt-1 text-sm text-muted">You will use this to sign in to ServiceHub.</p>
        <ActionForm action={setPassword} submitLabel="Save password">
          <Field label="New password" name="password" type="password" required autoComplete="new-password" hint="At least 10 characters." />
          <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
        </ActionForm>
      </div>
    </main>
  );
}
