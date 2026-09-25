import Link from "next/link";
import { requireClientUser } from "@/lib/auth/session";
import { listClientSubscriptions } from "@/server/services/client-portal";
import { PageHeader } from "@/components/detail-list";
import { Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { cycleLabel, formatDate } from "@/lib/format";

export const metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const user = await requireClientUser();
  const subs = await listClientSubscriptions(user.clientId);
  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" subtitle="What you pay for, and when it renews." />
      <Table empty={subs.length === 0 ? "No subscriptions found." : undefined}>
        <thead><tr><Th>Service</Th><Th>Plan</Th><Th>Price</Th><Th>Auto-renew</Th><Th>Next renewal</Th><Th>Status</Th></tr></thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id}>
              <Td><Link href={`/services/${s.service.id}`} className="font-medium hover:text-accent-soft">{s.service.name}</Link>
                <p className="text-xs text-muted">{s.service.serviceType.name} · {s.service.project.name}</p></Td>
              <Td>{s.plan.name}</Td>
              <Td>{formatNaira(s.price)}{s.billingCycle !== "ONE_TIME" && `/${cycleLabel[s.billingCycle]}`}</Td>
              <Td>{s.autoRenew ? "On" : "Off"}</Td>
              <Td>{formatDate(s.nextBillingDate)}</Td>
              <Td><StatusBadge status={s.status} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
