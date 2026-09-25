import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-sm text-muted">404</p>
        <h1 className="mt-1 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you are looking for doesn&apos;t exist or has moved.</p>
        <Link href="/" className="mt-6 inline-block rounded-md border border-line px-4 py-2 text-sm hover:bg-surface">Back to ServiceHub</Link>
      </div>
    </main>
  );
}
