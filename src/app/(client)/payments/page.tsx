import Link from "next/link";
import { requireClientUser } from "@/lib/auth/session";
import { listClientPayments } from "@/server/services/client-portal";
import { PageHeader } from "@/components/detail-list";
import { Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { formatDate, methodLabel } from "@/lib/format";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await requireClientUser();
  const payments = await listClientPayments(user.clientId);
  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Your payment history." />
      <Table empty={payments.length === 0 ? "No payments yet." : undefined}>
        <thead><tr><Th>Reference</Th><Th>For</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Date</Th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/payments/${p.id}`} className="font-medium hover:text-accent-soft">{p.reference}</Link></Td>
              <Td>{p.invoice.description}</Td>
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
