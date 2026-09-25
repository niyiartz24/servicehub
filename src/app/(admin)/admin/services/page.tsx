import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listServicesAdmin } from "@/server/services/services-admin";
import { listServiceTypes } from "@/server/services/plans";
import { updateServiceAction, deleteServiceAction } from "../actions";
import { ActionForm } from "@/components/action-form";
import { ConfirmForm } from "@/components/confirm-form";
import { Field, TextArea } from "@/components/form-fields";
import { FilterTabs, SearchBox } from "@/components/filter-tabs";
import { StatusBadge } from "@/components/status-badge";
import { Table, Td, Th } from "@/components/table";
import { formatNaira } from "@/config/brand";
import { cycleLabel, formatDate } from "@/lib/format";

export const metadata = { title: "Services" };

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  await requireAdmin("subscriptions:manage");
  const sp = await searchParams;
  const [types, services] = await Promise.all([
    listServiceTypes(),
    listServicesAdmin({ q: sp.q, serviceTypeId: sp.type }),
  ]);
  const type = types.find((t) => t.id === sp.type);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="mt-1 text-sm text-muted">Every service delivered to a client project. Pricing and billing status live on its subscription.</p>
      </div>

      <FilterTabs basePath="/admin/services" param="type" current={type?.id} keep={{ q: sp.q }}
        options={types.map((t) => ({ value: t.id, label: t.name }))} />
      <SearchBox q={sp.q} keep={{ type: sp.type }} label="Search service, project or client" />

      <Table empty={services.length === 0 ? "No services match." : undefined}>
        <thead><tr><Th>Service</Th><Th>Client / Project</Th><Th>Type</Th><Th>Usage</Th><Th>Subscription</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {services.map((s) => {
            const sub = s.subscriptions[0];
            return (
              <tr key={s.id}>
                <Td>
                  <p className="font-medium">{s.name}</p>
                  {s.provider && <p className="text-xs text-muted">{s.provider}</p>}
                </Td>
                <Td>
                  <Link href={`/admin/clients/${s.project.client.id}`} className="hover:text-accent-soft">{s.project.client.name}</Link>
                  <p className="text-xs text-muted">{s.project.name}</p>
                </Td>
                <Td>{s.serviceType.name}</Td>
                <Td>
                  {s.usageUsed != null && s.usageLimit != null
                    ? `${Number(s.usageUsed)} / ${Number(s.usageLimit)} ${s.usageUnit ?? ""}`
                    : <span className="text-muted">—</span>}
                </Td>
                <Td>
                  {sub ? (
                    <>
                      <StatusBadge status={sub.status} />
                      <p className="mt-1 text-xs text-muted">{formatNaira(sub.price)}/{cycleLabel[sub.billingCycle]} · renews {formatDate(sub.nextBillingDate)}</p>
                    </>
                  ) : <Link href="/admin/subscriptions" className="text-xs text-accent-soft">Assign one</Link>}
                </Td>
                <Td>
                  <details className="w-72 max-w-full">
                    <summary className="cursor-pointer text-xs text-accent-soft">Edit</summary>
                    <div className="mt-3 space-y-4">
                      <ActionForm action={updateServiceAction} submitLabel="Save">
                        <input type="hidden" name="id" value={s.id} />
                        <Field label="Service name" name="name" required defaultValue={s.name} />
                        <Field label="Provider (internal)" name="provider" defaultValue={s.provider ?? ""} />
                        <div className="grid grid-cols-3 gap-3">
                          <Field label="Used" name="usageUsed" type="number" step="0.1" defaultValue={s.usageUsed != null ? Number(s.usageUsed) : ""} />
                          <Field label="Limit" name="usageLimit" type="number" step="0.1" defaultValue={s.usageLimit != null ? Number(s.usageLimit) : ""} />
                          <Field label="Unit" name="usageUnit" placeholder="GB" defaultValue={s.usageUnit ?? ""} />
                        </div>
                        <TextArea label="Internal notes" name="notes" defaultValue={s.notes ?? ""} />
                      </ActionForm>
                      {!sub && (
                        <ConfirmForm action={deleteServiceAction} hidden={{ id: s.id }} danger label="Delete service"
                          message="Delete this service? This only works if it has never had a subscription." />
                      )}
                    </div>
                  </details>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}