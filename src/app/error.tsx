"use client";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div role="alert" className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">Please try again. If it keeps happening, contact SynthaxLab support.</p>
        <button onClick={reset} className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface">Try again</button>
      </div>
    </main>
  );
}
