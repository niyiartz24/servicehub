import Link from "next/link";
import { requireClientUser } from "@/lib/auth/session";
import { effectiveInvoiceStatus, listClientInvoices } from "@/server/services/client-portal";
import { PageHeader } from "@/components/detail-list";
import { Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const user = await requireClientUser();
  const invoices = await listClientInvoices(user.clientId);
  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" />
      <Table empty={invoices.length === 0 ? "No invoices yet." : undefined}>
        <thead><tr><Th>Invoice</Th><Th>Description</Th><Th>Amount</Th><Th>Due</Th><Th>Status</Th></tr></thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <Td><Link href={`/invoices/${i.id}`} className="font-medium hover:text-accent-soft">{i.number}</Link></Td>
              <Td>{i.description}</Td>
              <Td>{formatNaira(i.total)}</Td>
              <Td>{formatDate(i.dueDate)}</Td>
              <Td><StatusBadge status={effectiveInvoiceStatus(i)} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
