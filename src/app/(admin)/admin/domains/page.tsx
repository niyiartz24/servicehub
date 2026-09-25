import Link from "next/link";
import type { DomainRequestStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { listDomainRequests } from "@/server/services/domains";
import { requestDomainPaymentAction, updateDomainRequestAction } from "../ops-actions";
import { ActionForm } from "@/components/action-form";
import { FilterTabs } from "@/components/filter-tabs";
import { Field, Select, TextArea } from "@/components/form-fields";
import { StatusBadge } from "@/components/status-badge";
import { Table, Td, Th } from "@/components/table";
import { formatNaira } from "@/config/brand";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Domain requests" };
const STATUSES: DomainRequestStatus[] = ["PENDING", "CHECKING", "AVAILABLE", "UNAVAILABLE", "PAYMENT_PENDING", "PURCHASED", "ACTIVE", "REJECTED"];
const label = (s: string) => s.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default async function AdminDomains({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("domains:manage");
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const requests = await listDomainRequests(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Domain requests</h1>
        <p className="mt-1 text-sm text-muted">SynthaxLab is not a registrar: check availability and buy the domain manually, then mark it Active.</p>
      </div>
      <FilterTabs basePath="/admin/domains" current={status} options={STATUSES.map((s) => ({ value: s, label: label(s) }))} />
      <Table empty={requests.length === 0 ? "No domain requests." : undefined}>
        <thead><tr><Th>Client</Th><Th>Requested domain</Th><Th>Status</Th><Th>Amount</Th><Th>Date</Th><Th>Action</Th></tr></thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <Td><Link href={`/admin/clients/${r.client.id}`} className="hover:text-accent-soft">{r.client.name}</Link>{r.project && <p className="text-xs text-muted">{r.project.name}</p>}</Td>
              <Td><span className="font-medium">{r.domain}</span><p className="text-xs text-muted">{r.durationYears} yr · {r.purpose ?? "no purpose given"}</p>{r.notes && <p className="text-xs text-muted">Client note: {r.notes}</p>}</Td>
              <Td><StatusBadge status={r.status} />{r.invoice && <p className="mt-1 text-xs text-muted">{r.invoice.number}: {r.invoice.status}</p>}</Td>
              <Td>{r.clientPrice ? formatNaira(r.clientPrice) : "—"}{r.registrarCost ? <p className="text-xs text-muted">Cost {formatNaira(r.registrarCost)}</p> : null}</Td>
              <Td>{formatDate(r.createdAt)}</Td>
              <Td>
                <details className="w-72 max-w-full">
                  <summary className="cursor-pointer text-accent-soft">Manage</summary>
                  <div className="mt-3 space-y-4">
                    <ActionForm action={updateDomainRequestAction} submitLabel="Save">
                      <input type="hidden" name="id" value={r.id} />
                      <Select label="Status" name="status" defaultValue={r.status} options={STATUSES.map((s) => ({ value: s, label: label(s) }))} />
                      <Field label="Registrar cost (₦, internal)" name="registrarCost" type="number" step="0.01" defaultValue={r.registrarCost ? r.registrarCost / 100 : ""} />
                      <Field label="Client price (₦)" name="clientPrice" type="number" step="0.01" defaultValue={r.clientPrice ? r.clientPrice / 100 : ""} />
                      <TextArea label="Internal notes" name="adminNotes" defaultValue={r.adminNotes ?? ""} />
                    </ActionForm>
                    {(r.status === "AVAILABLE" || r.status === "PAYMENT_PENDING") && (
                      <ActionForm action={requestDomainPaymentAction} submitLabel="Create payment request">
                        <input type="hidden" name="id" value={r.id} />
                        <p className="text-xs text-muted">Creates an invoice for the client price and notifies the client.</p>
                      </ActionForm>
                    )}
                  </div>
                </details>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
