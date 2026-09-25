export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4 animate-pulse">
      <div className="h-7 w-56 rounded bg-surface" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-surface" />)}
      </div>
      <div className="h-48 rounded-lg bg-surface" />
    </div>
  );
}
