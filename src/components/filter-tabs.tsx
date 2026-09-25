import Link from "next/link";

/** URL-driven filter tabs: server-rendered, shareable, no client JS. */
export function FilterTabs({ basePath, param = "status", options, current, keep }: {
  basePath: string; param?: string; options: { value: string; label: string }[]; current?: string; keep?: Record<string, string | undefined>;
}) {
  const href = (value: string) => {
    const sp = new URLSearchParams();
    Object.entries(keep ?? {}).forEach(([k, v]) => v && sp.set(k, v));
    if (value) sp.set(param, value);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="Filter" className="flex flex-wrap gap-2">
      {[{ value: "", label: "All" }, ...options].map((o) => {
        const active = (current ?? "") === o.value;
        return (
          <Link key={o.value} href={href(o.value)} aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent/10 text-ink" : "border-line text-muted hover:text-ink"}`}>
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SearchBox({ q, keep, label = "Search" }: { q?: string; keep?: Record<string, string | undefined>; label?: string }) {
  return (
    <form role="search" className="flex gap-2">
      {Object.entries(keep ?? {}).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label htmlFor="q" className="sr-only">{label}</label>
      <input id="q" name="q" defaultValue={q} placeholder={label} className="w-full max-w-sm rounded-md border border-line bg-charcoal px-3 py-2 text-sm" />
      <button className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface">Search</button>
    </form>
  );
}
