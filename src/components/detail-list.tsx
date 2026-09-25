export function DetailList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 rounded-lg border border-line bg-charcoal p-5 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{i.label}</dt>
          <dd className="mt-1 text-sm">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: { href: string; label: string } }) {
  return (
    <div>
      {back && <a href={back.href} className="text-sm text-muted hover:text-ink">← {back.label}</a>}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
