import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientUser } from "@/lib/auth/session";
import { effectiveInvoiceStatus, getClientInvoice } from "@/server/services/client-portal";
import { DetailList, PageHeader } from "@/components/detail-list";
import { ActionForm } from "@/components/action-form";
import { Select } from "@/components/form-fields";
import { payInvoiceAction, submitManualPaymentAction } from "../../actions";
import { Field } from "@/components/form-fields";
import { Disclosure } from "@/components/table";
import { getBankDetails } from "@/server/services/settings";
import { Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { formatDate, formatPeriod } from "@/lib/format";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireClientUser();
  const { id } = await params;
  const inv = await getClientInvoice(user.clientId, id);
  if (!inv) notFound();
  const status = effectiveInvoiceStatus(inv);
  const bank = await getBankDetails();

  return (
    <div className="space-y-8">
      <PageHeader back={{ href: "/invoices", label: "Invoices" }} title={inv.number} subtitle={inv.description} />
      <StatusBadge status={status} />

      <DetailList items={[
        { label: "Project", value: inv.project?.name ?? "—" },
        { label: "Billing period", value: formatPeriod(inv.periodStart, inv.periodEnd) },
        { label: "Issued", value: formatDate(inv.createdAt) },
        { label: "Due", value: formatDate(inv.dueDate) },
        { label: "Paid", value: formatDate(inv.paidAt) },
        { label: "Currency", value: inv.currency },
      ]} />

      <Table>
        <thead><tr><Th>Item</Th><Th>Qty</Th><Th>Unit price</Th><Th>Amount</Th></tr></thead>
        <tbody>
          {inv.items.map((it) => <tr key={it.id}><Td>{it.description}</Td><Td>{it.quantity}</Td><Td>{formatNaira(it.unitPrice)}</Td><Td>{formatNaira(it.amount)}</Td></tr>)}
          <tr><Td className="text-muted" >Subtotal</Td><Td /><Td /><Td>{formatNaira(inv.subtotal)}</Td></tr>
          {inv.tax > 0 && <tr><Td className="text-muted">Tax</Td><Td /><Td /><Td>{formatNaira(inv.tax)}</Td></tr>}
          <tr><Td className="font-medium">Total</Td><Td /><Td /><Td className="font-medium">{formatNaira(inv.total)}</Td></tr>
        </tbody>
      </Table>

      {(status === "PENDING" || status === "OVERDUE") && (
        <section aria-labelledby="pay" className="rounded-lg border border-accent/30 bg-charcoal p-5">
          <h2 id="pay" className="font-medium">Pay {formatNaira(inv.total)}</h2>
          <p className="mt-1 text-sm text-muted">You will be taken to our payment provider. Your service is updated once the payment is confirmed.</p>
          <div className="mt-4 max-w-xs">
            <ActionForm action={payInvoiceAction} submitLabel="Continue to payment">
              <input type="hidden" name="invoiceId" value={inv.id} />
              <Select label="Payment method" name="method" options={[{ value: "CARD", label: "Card" }, { value: "BANK_TRANSFER_PAYSTACK", label: "Bank transfer" }]} />
            </ActionForm>
          </div>
          {bank && (
            <div className="mt-6">
              <Disclosure summary="Pay by manual bank transfer instead">
                <p className="mb-3 text-sm text-muted">
                  Transfer {formatNaira(inv.total)} to <strong className="text-ink">{bank.accountName}</strong>, {bank.bankName}, account {bank.accountNumber}. Then tell us below and we will confirm it.
                </p>
                <ActionForm action={submitManualPaymentAction} submitLabel="Submit transfer details">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <Field label="Amount transferred (₦)" name="declaredAmount" type="number" step="0.01" required defaultValue={inv.total / 100} />
                  <Field label="Transfer reference / narration" name="transferReference" required />
                  <Field label="Proof of payment (PDF, PNG or JPG, max 5 MB)" name="proof" type="file" accept="application/pdf,image/png,image/jpeg" />
                </ActionForm>
              </Disclosure>
            </div>
          )}
        </section>
      )}

      {inv.payments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Payments</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-charcoal text-sm">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                <Link href={`/payments/${p.id}`} className="hover:text-accent-soft">{p.reference}</Link>
                <span>{formatNaira(p.amount)}</span><StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
