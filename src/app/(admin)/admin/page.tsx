import { requireAdmin } from "@/lib/auth/session";
import { getAdminMetrics } from "@/server/services/admin-dashboard";
import { StatCard } from "@/components/stat-card";
import { formatNaira } from "@/config/brand";

export const metadata = { title: "Admin overview" };

export default async function AdminHome() {
  await requireAdmin();
  const m = await getAdminMetrics();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted">Platform health at a glance.</p>
      </div>
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total clients" value={m.clients} />
        <StatCard label="Active projects" value={m.projects} />
        <StatCard label="Active subscriptions" value={m.activeSubscriptions} />
        <StatCard label="Monthly recurring revenue" value={formatNaira(m.mrr)} hint="Monthly, quarterly and yearly plans normalised" />
        <StatCard label="Pending payments" value={m.pendingPayments} />
        <StatCard label="Expiring in 30 days" value={m.expiring} />
        <StatCard label="Pending domain requests" value={m.pendingDomains} />
        <StatCard label="Open support requests" value={m.openTickets} />
      </section>
    </div>
  );
}
