"use client";

export default function ClientError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
      <h2 className="font-medium">We couldn&apos;t load this page.</h2>
      <p className="mt-1 text-sm text-muted">This is usually temporary. If it keeps happening, contact SynthaxLab support.</p>
      <button onClick={reset} className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface">Try again</button>
    </div>
  );
}
