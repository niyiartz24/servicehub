import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/form-fields";
import { requestPasswordReset } from "@/lib/auth/actions";
import { brand } from "@/config/brand";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-xl font-semibold">{brand.name}</p>
        <p className="mb-8 text-sm text-muted">Enter your email and we will send a reset link.</p>
        <ActionForm action={requestPasswordReset} submitLabel="Send reset link">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
        </ActionForm>
        <Link href="/login" className="mt-6 inline-block text-sm text-muted hover:text-ink">Back to sign in</Link>
      </div>
    </main>
  );
}
