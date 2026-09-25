import Link from "next/link";
import { requireClientUser } from "@/lib/auth/session";
import { getClientDashboard } from "@/server/services/client-dashboard";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { cycleLabel, daysUntil, formatDate } from "@/lib/format";

export const metadata = { title: "Dashboard" };

const RENEWABLE = new Set(["DOMAIN", "HOSTING", "DATABASE", "MAINTENANCE", "SSL", "EMAIL"]);
const UPGRADABLE = new Set(["HOSTING", "DATABASE", "EMAIL"]);

export default async function DashboardPage() {
  const user = await requireClientUser();
  const data = await getClientDashboard(user.clientId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {data.clientName}.</h1>
        <p className="mt-1 text-sm text-muted">Your services, what is due, and what to do next.</p>
      </div>

      <section aria-label="Overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active services" value={data.activeServices} />
        <StatCard label="Upcoming payments" value={data.upcomingPayments} />
        <StatCard label="Amount due" value={formatNaira(data.amountDue)} />
        <StatCard label="Support requests" value={data.openTickets} />
      </section>

      <section aria-labelledby="my-services">
        <h2 id="my-services" className="mb-3 text-lg font-medium">My services</h2>
        {data.services.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">No services found.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-charcoal">
            {data.services.map((s) => {
              const d = daysUntil(s.nextBillingDate);
              return (
                <li key={s.subscriptionId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{s.typeName} · {s.projectName}</p>
                    <p className="truncate font-medium">{s.serviceName}</p>
                    <p className="text-sm text-muted">
                      {s.planName !== s.serviceName && `${s.planName} · `}
                      {formatNaira(s.price)}{s.billingCycle !== "ONE_TIME" && `/${cycleLabel[s.billingCycle]}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <div className="text-sm sm:text-right">
                      <StatusBadge status={s.status} />
                      <p className="mt-1 text-xs text-muted">
                        Renews {formatDate(s.nextBillingDate)}{d !== null && d >= 0 && d <= 14 && ` (${d}d)`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/services/${s.serviceId}`} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface">View</Link>
                      {RENEWABLE.has(s.typeCode) && (
                        <Link href={`/services/${s.serviceId}?action=renew`} className="rounded-md bg-accent px-3 py-1.5 text-sm text-white">Renew</Link>
                      )}
                      {UPGRADABLE.has(s.typeCode) && (
                        <Link href={`/services/${s.serviceId}?action=upgrade`} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface">Upgrade</Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
