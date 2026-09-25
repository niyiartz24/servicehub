import Link from "next/link";
import type { InvoiceStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { listInvoices } from "@/server/services/admin-payments";
import { FilterTabs, SearchBox } from "@/components/filter-tabs";
import { StatusBadge } from "@/components/status-badge";
import { Table, Td, Th } from "@/components/table";
import { formatNaira } from "@/config/brand";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Invoices" };
const STATUSES: InvoiceStatus[] = ["PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED", "DRAFT"];

export default async function AdminInvoices({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin("payments:manage");
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const invoices = await listInvoices({ status, q: sp.q });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
      <FilterTabs basePath="/admin/invoices" current={status} keep={{ q: sp.q }} options={STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
      <SearchBox q={sp.q} keep={{ status }} label="Search number, client or description" />
      <Table empty={invoices.length === 0 ? "No invoices match." : undefined}>
        <thead><tr><Th>Number</Th><Th>Client</Th><Th>Description</Th><Th>Total</Th><Th>Status</Th><Th>Due</Th></tr></thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <Td className="font-medium">{i.number}</Td>
              <Td><Link href={`/admin/clients/${i.client.id}`} className="hover:text-accent-soft">{i.client.name}</Link></Td>
              <Td>{i.description}</Td><Td>{formatNaira(i.total)}</Td>
              <Td><StatusBadge status={i.status} /></Td><Td>{formatDate(i.dueDate)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
