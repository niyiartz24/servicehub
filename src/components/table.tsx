import { ResponsiveTable } from "./responsive-table";

export function Table({ children, empty }: { children: React.ReactNode; empty?: string }) {
  return <ResponsiveTable empty={empty}>{children}</ResponsiveTable>;
}
export const Th = ({ children }: { children?: React.ReactNode }) => (
  <th scope="col" className="border-b border-line px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</th>
);
export const Td = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <td className={`border-b border-line/60 px-4 py-3 align-top ${className}`}>{children}</td>
);

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-medium">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-line bg-charcoal">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{summary}</summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  );
}
