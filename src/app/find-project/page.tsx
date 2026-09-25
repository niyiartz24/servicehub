import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/form-fields";
import { brand } from "@/config/brand";
import { findProjectAction } from "./actions";

export const metadata = { title: "Find your project" };

export default function FindProjectPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-xl font-semibold">{brand.name}</Link>
        <p className="mb-8 mt-1 text-sm text-muted">Not sure how to sign in? Tell us your project and we will email instructions to the address SynthaxLab has on file.</p>
        <ActionForm action={findProjectAction} submitLabel="Email me instructions">
          <Field label="Project name or domain" name="project" required placeholder="example.com" />
          <Field label="Email on file" name="email" type="email" required autoComplete="email" />
        </ActionForm>
        <Link href="/login" className="mt-6 inline-block text-sm text-muted hover:text-ink">Back to sign in</Link>
      </div>
    </main>
  );
}
