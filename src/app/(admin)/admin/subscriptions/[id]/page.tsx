import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSubscription } from "@/server/services/subscriptions";
import { updateSubscriptionAction } from "../../actions";
import { ActionForm } from "@/components/action-form";
import { Checkbox, Field, Select, TextArea } from "@/components/form-fields";
import { Section, Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { formatDate } from "@/lib/format";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x.replaceAll("_", " ") }));

export default async function SubscriptionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("subscriptions:manage");
  const { id } = await params;
  const s = await getSubscription(id);
  if (!s) notFound();

  const [plans, history] = await Promise.all([
    db.servicePlan.findMany({ where: { serviceTypeId: s.service.serviceTypeId, OR: [{ isActive: true }, { id: s.planId }] }, orderBy: { defaultPrice: "asc" } }),
    db.auditLog.findMany({ where: { entity: "Subscription", entityId: s.id }, orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { email: true } } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/subscriptions" className="text-sm text-muted hover:text-ink">← Subscriptions</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{s.service.name}</h1>
        <p className="mt-1 text-sm text-muted">{s.client.name} · {s.service.project.name} · {s.service.serviceType.name}</p>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <StatusBadge status={s.status} />
          <span>Client price {formatNaira(s.price)}</span>
          <span className="text-muted">Plan default {formatNaira(s.plan.defaultPrice)}</span>
        </div>
      </div>

      <Section title="Edit subscription">
        <div className="rounded-lg border border-line bg-charcoal p-4">
          <ActionForm action={updateSubscriptionAction} submitLabel="Save changes">
            <input type="hidden" name="id" value={s.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Plan" name="planId" defaultValue={s.planId}
                options={plans.map((p) => ({ value: p.id, label: `${p.name} (${formatNaira(p.defaultPrice)})${p.isActive ? "" : " – inactive"}` }))} />
              <Field label="Client price (₦)" name="price" type="number" step="0.01" required defaultValue={s.price / 100}
                hint="Changing plan does not change this price. Set it explicitly." />
              <Select label="Billing cycle" name="billingCycle" defaultValue={s.billingCycle} options={opts(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME", "CUSTOM"])} />
              <Select label="Status" name="status" defaultValue={s.status} options={opts(["ACTIVE", "PENDING", "EXPIRING", "EXPIRED", "SUSPENDED", "CANCELLED"])} />
              <Field label="Next billing date" name="nextBillingDate" type="date" defaultValue={iso(s.nextBillingDate)} />
            </div>
            <TextArea label="Notes" name="notes" defaultValue={s.notes ?? ""} />
            <Checkbox label="Auto-renew" name="autoRenew" defaultChecked={s.autoRenew} />
          </ActionForm>
        </div>
      </Section>

      <Section title="Change history">
        <Table empty={history.length === 0 ? "No recorded changes." : undefined}>
          <thead><tr><Th>When</Th><Th>Action</Th><Th>By</Th><Th>Details</Th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <Td>{formatDate(h.createdAt)}</Td><Td>{h.action}</Td><Td>{h.actor?.email ?? "system"}</Td>
                <Td><code className="break-all text-xs text-muted">{h.metadata ? JSON.stringify(h.metadata) : ""}</code></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>
    </div>
  );
}
