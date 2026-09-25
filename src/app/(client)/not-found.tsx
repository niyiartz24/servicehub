import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-dashed border-line p-10 text-center">
      <h2 className="font-medium">Not found</h2>
      <p className="mt-1 text-sm text-muted">This item doesn&apos;t exist or isn&apos;t part of your account.</p>
      <Link href="/dashboard" className="mt-4 inline-block text-sm text-accent-soft">Back to dashboard</Link>
    </div>
  );
}
