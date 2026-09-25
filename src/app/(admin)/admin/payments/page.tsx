import Link from "next/link";
import type { PaymentStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { listPayments } from "@/server/services/admin-payments";
import { approveManualPaymentAction, rejectManualPaymentAction } from "../ops-actions";
import { ActionForm } from "@/components/action-form";
import { FilterTabs, SearchBox } from "@/components/filter-tabs";
import { Field } from "@/components/form-fields";
import { StatusBadge } from "@/components/status-badge";
import { Table, Td, Th } from "@/components/table";
import { formatNaira } from "@/config/brand";
import { formatDate, methodLabel } from "@/lib/format";

export const metadata = { title: "Payments" };
const STATUSES: PaymentStatus[] = ["PAID", "PENDING", "FAILED", "REFUNDED"];

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin("payments:manage");
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const payments = await listPayments({ status, q: sp.q });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <FilterTabs basePath="/admin/payments" current={status} keep={{ q: sp.q }} options={STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
      <SearchBox q={sp.q} keep={{ status }} label="Search client, reference, invoice or service" />

      <Table empty={payments.length === 0 ? "No payments match." : undefined}>
        <thead><tr><Th>Reference</Th><Th>Client</Th><Th>For</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Date</Th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <Td>
                <span className="font-medium">{p.reference}</span>
                {p.gateway === "mock" && <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">TEST</span>}
                {p.manualProof?.status === "SUBMITTED" && (
                  <details className="mt-2 w-80 max-w-full">
                    <summary className="cursor-pointer text-xs text-accent-soft">Review transfer</summary>
                    <div className="mt-3 space-y-4 text-sm">
                      <p className="text-muted">Declared {formatNaira(p.manualProof.declaredAmount)} · ref <span className="text-ink">{p.manualProof.transferReference}</span></p>
                      {p.proofUrl ? <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-accent-soft underline">View proof (link expires in 5 min)</a> : <p className="text-muted">No proof attached.</p>}
                      <ActionForm action={approveManualPaymentAction} submitLabel="Approve">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <Field label="Amount received in bank (₦)" name="amountReceived" type="number" step="0.01" required hint={`Invoice total is ${formatNaira(p.amount)}. Check your bank statement.`} />
                        <Field label="Note (optional)" name="note" />
                      </ActionForm>
                      <ActionForm action={rejectManualPaymentAction} submitLabel="Reject">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <Field label="Reason for client" name="note" required />
                      </ActionForm>
                    </div>
                  </details>
                )}
                {p.failureReason && <p className="mt-1 text-xs text-red-300">{p.failureReason}</p>}
              </Td>
              <Td><Link href={`/admin/clients/${p.client.id}`} className="hover:text-accent-soft">{p.client.name}</Link></Td>
              <Td>{p.invoice.number}<p className="text-xs text-muted">{p.invoice.description}</p></Td>
              <Td>{formatNaira(p.amount)}</Td>
              <Td>{methodLabel[p.method]}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td>{formatDate(p.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
