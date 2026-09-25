const TONE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  PAID: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  PENDING: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  EXPIRING: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  EXPIRED: "bg-red-500/10 text-red-300 ring-red-500/30",
  OVERDUE: "bg-red-500/10 text-red-300 ring-red-500/30",
  SUSPENDED: "bg-red-500/10 text-red-300 ring-red-500/30",
  CANCELLED: "bg-slate-500/10 text-slate-300 ring-slate-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONE[status] ?? "bg-slate-500/10 text-slate-300 ring-slate-500/30";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
