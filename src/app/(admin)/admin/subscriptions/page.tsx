import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listSubscriptions } from "@/server/services/subscriptions";
import { listPlans } from "@/server/services/plans";
import { assignServiceAction } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Checkbox, Field, Select, TextArea } from "@/components/form-fields";
import { Disclosure, Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { cycleLabel, formatDate } from "@/lib/format";

export const metadata = { title: "Subscriptions" };
const CYCLES = [{ value: "", label: "Use plan default" }, ...["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME", "CUSTOM"].map((c) => ({ value: c, label: c.replace("_", " ") }))];
const STATUSES = ["ACTIVE", "PENDING", "SUSPENDED"].map((s) => ({ value: s, label: s }));

export default async function SubscriptionsPage() {
  await requireAdmin("subscriptions:manage");
  const [subs, plans, projects] = await Promise.all([
    listSubscriptions(),
    listPlans(),
    db.project.findMany({ where: { isActive: true, client: { isActive: true } }, include: { client: { select: { name: true } } }, orderBy: [{ client: { name: "asc" } }, { name: "asc" }] }),
  ]);
  const activePlans = plans.filter((p) => p.isActive);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>

      <Disclosure summary="Assign service to project">
        {projects.length === 0 || activePlans.length === 0 ? (
          <p className="text-sm text-muted">You need at least one active project and one active plan first.</p>
        ) : (
          <ActionForm action={assignServiceAction} submitLabel="Assign service">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Project" name="projectId" required options={projects.map((p) => ({ value: p.id, label: `${p.client.name} / ${p.name}` }))} />
              <Select label="Plan" name="planId" required options={activePlans.map((p) => ({ value: p.id, label: `${p.serviceType.name}: ${p.name} (${formatNaira(p.defaultPrice)})` }))} />
              <Field label="Service name" name="serviceName" required placeholder="ravers.ng or PostgreSQL Standard" />
              <Field label="Custom client price (₦)" name="price" type="number" step="0.01" hint="Leave blank to use the plan's default price." />
              <Select label="Billing cycle" name="billingCycle" options={CYCLES} />
              <Select label="Status" name="status" options={STATUSES} defaultValue="ACTIVE" />
              <Field label="Start date" name="startDate" type="date" required />
              <Field label="Next billing date" name="nextBillingDate" type="date" hint="Blank = start date plus one billing cycle." />
            </div>
            <TextArea label="Notes" name="notes" />
            <Checkbox label="Auto-renew" name="autoRenew" />
          </ActionForm>
        )}
      </Disclosure>

      <Table empty={subs.length === 0 ? "No subscriptions yet." : undefined}>
        <thead><tr><Th>Client</Th><Th>Service</Th><Th>Client price</Th><Th>Plan default</Th><Th>Next billing</Th><Th>Status</Th></tr></thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id}>
              <Td><Link href={`/admin/clients/${s.client.id}`} className="hover:text-accent-soft">{s.client.name}</Link><p className="text-xs text-muted">{s.service.project.name}</p></Td>
              <Td><Link href={`/admin/subscriptions/${s.id}`} className="font-medium hover:text-accent-soft">{s.service.name}</Link><p className="text-xs text-muted">{s.service.serviceType.name} · {s.plan.name}</p></Td>
              <Td>{formatNaira(s.price)}/{cycleLabel[s.billingCycle]}{s.isCustomPrice && <span className="ml-1 text-xs text-accent-soft">custom</span>}</Td>
              <Td className="text-muted">{formatNaira(s.plan.defaultPrice)}</Td>
              <Td>{formatDate(s.nextBillingDate)}</Td>
              <Td><StatusBadge status={s.status} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
