import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientUser } from "@/lib/auth/session";
import { getClientPayment } from "@/server/services/client-portal";
import { settlePayment } from "@/server/services/settlement";
import { AutoRefresh } from "@/components/auto-refresh";
import { DetailList, PageHeader } from "@/components/detail-list";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { formatDate, formatPeriod, methodLabel } from "@/lib/format";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireClientUser();
  const { id } = await params;
  let p = await getClientPayment(user.clientId, id);
  if (!p) notFound();
  if (p.status === "PENDING" && p.method !== "BANK_TRANSFER_MANUAL") {
    // Server-side re-verification, so a missed webhook can't leave a paid invoice looking unpaid.
    await settlePayment(p.reference).catch((e) => console.error("Verify-on-view failed", e));
    p = (await getClientPayment(user.clientId, id)) ?? p;
  }

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/payments", label: "Payments" }} title={p.reference} subtitle={p.invoice.description} />
      <StatusBadge status={p.status} />
      <DetailList items={[
        { label: "Amount", value: formatNaira(p.amount) },
        { label: "Method", value: methodLabel[p.method] },
        { label: "Initiated", value: formatDate(p.createdAt) },
        { label: "Verified", value: p.status === "PAID" ? formatDate(p.verifiedAt) : "—" },
        { label: "Invoice", value: <Link href={`/invoices/${p.invoice.id}`} className="text-accent-soft">{p.invoice.number}</Link> },
        { label: "Billing period", value: formatPeriod(p.invoice.periodStart, p.invoice.periodEnd) },
      ]} />
      <AutoRefresh active={p.status === "PENDING" && p.method !== "BANK_TRANSFER_MANUAL"} />
      {p.status === "PAID" && <p role="status" className="text-sm text-emerald-300">Payment confirmed. Your service has been updated.</p>}
      {p.status === "PENDING" && p.method === "BANK_TRANSFER_MANUAL" && <p className="text-sm text-muted">Awaiting confirmation by SynthaxLab. We will notify you once it is reviewed.</p>}
      {p.status === "PENDING" && p.method !== "BANK_TRANSFER_MANUAL" && (
        <p className="text-sm text-muted">Payment verification is taking longer than expected? It can take a few minutes. Contact support if it stays pending.</p>
      )}
    </div>
  );
}
