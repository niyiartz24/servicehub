import { requireAdmin } from "@/lib/auth/session";
import { listPlans, listServiceTypes } from "@/server/services/plans";
import { createPlanAction, removePlanAction, setPlanActiveAction, updatePlanAction } from "../actions";
import { ActionForm } from "@/components/action-form";
import { ConfirmForm } from "@/components/confirm-form";
import { Field, Select } from "@/components/form-fields";
import { Disclosure, Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { cycleLabel } from "@/lib/format";

export const metadata = { title: "Plans" };
const CYCLES = ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME", "CUSTOM"].map((c) => ({ value: c, label: c.replace("_", " ") }));
const specNum = (s: unknown, k: string) => (s && typeof s === "object" ? (s as Record<string, unknown>)[k] : undefined) as number | undefined;

export default async function PlansPage() {
  await requireAdmin("plans:manage");
  const [plans, types] = await Promise.all([listPlans(), listServiceTypes()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Service plans</h1>
        <p className="mt-1 text-sm text-muted">Default prices only. Client-specific pricing is set on each subscription.</p>
      </div>

      <Disclosure summary="Create plan">
        <ActionForm action={createPlanAction} submitLabel="Create plan">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Service type" name="serviceTypeId" required options={types.map((t) => ({ value: t.id, label: t.name }))} />
            <Field label="Plan name" name="name" required placeholder="PostgreSQL Standard" />
            <Field label="Default price (₦)" name="defaultPrice" type="number" step="0.01" required />
            <Select label="Billing cycle" name="billingCycle" options={CYCLES} />
            <Field label="Storage (GB)" name="storageGb" type="number" step="0.1" />
            <Field label="Bandwidth (GB)" name="bandwidthGb" type="number" step="0.1" />
          </div>
          <Field label="Description" name="description" />
        </ActionForm>
      </Disclosure>

      <Table empty={plans.length === 0 ? "No plans yet." : undefined}>
        <thead><tr><Th>Type</Th><Th>Plan</Th><Th>Default price</Th><Th>In use</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <Td>{p.serviceType.name}</Td>
              <Td>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted">{specNum(p.specs, "storageGb") ? `${specNum(p.specs, "storageGb")} GB` : ""}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-accent-soft">Edit</summary>
                  <div className="mt-3 w-72 max-w-full">
                    <ActionForm action={updatePlanAction} submitLabel="Save">
                      <input type="hidden" name="id" value={p.id} />
                      <Field label="Name" name="name" required defaultValue={p.name} />
                      <Field label="Default price (₦)" name="defaultPrice" type="number" step="0.01" required defaultValue={p.defaultPrice / 100} />
                      <Field label="Storage (GB)" name="storageGb" type="number" step="0.1" defaultValue={specNum(p.specs, "storageGb") ?? ""} />
                      <Field label="Bandwidth (GB)" name="bandwidthGb" type="number" step="0.1" defaultValue={specNum(p.specs, "bandwidthGb") ?? ""} />
                      <Field label="Description" name="description" defaultValue={p.description ?? ""} />
                    </ActionForm>
                  </div>
                </details>
              </Td>
              <Td>{formatNaira(p.defaultPrice)}/{cycleLabel[p.billingCycle]}</Td>
              <Td>{p._count.subscriptions}</Td>
              <Td><StatusBadge status={p.isActive ? "ACTIVE" : "SUSPENDED"} /></Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <ConfirmForm action={setPlanActiveAction} hidden={{ id: p.id, active: String(!p.isActive) }}
                    label={p.isActive ? "Deactivate" : "Activate"} message={p.isActive ? "Deactivate this plan? It will no longer be offered for new subscriptions." : "Activate this plan?"} />
                  <ConfirmForm action={removePlanAction} hidden={{ id: p.id }} danger
                    label={p._count.subscriptions ? "Archive" : "Delete"}
                    message={p._count.subscriptions ? "Archive this plan? Existing subscriptions keep working." : "Permanently delete this unused plan?"} />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
