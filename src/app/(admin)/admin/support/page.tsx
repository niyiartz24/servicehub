import Link from "next/link";
import type { TicketStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { listTicketsAdmin } from "@/server/services/tickets";
import { FilterTabs, SearchBox } from "@/components/filter-tabs";
import { StatusBadge } from "@/components/status-badge";
import { Table, Td, Th } from "@/components/table";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Support" };
const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CLIENT", "RESOLVED", "CLOSED"];
const label = (s: string) => s.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default async function AdminSupport({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin("support:manage");
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const tickets = await listTicketsAdmin({ status, q: sp.q });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Support requests</h1>
      <FilterTabs basePath="/admin/support" current={status} keep={{ q: sp.q }} options={STATUSES.map((s) => ({ value: s, label: label(s) }))} />
      <SearchBox q={sp.q} keep={{ status }} label="Search number, subject or client" />
      <Table empty={tickets.length === 0 ? "No support requests." : undefined}>
        <thead><tr><Th>Number</Th><Th>Subject</Th><Th>Client</Th><Th>Priority</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <Td>{t.number}</Td>
              <Td><Link href={`/admin/support/${t.id}`} className="font-medium hover:text-accent-soft">{t.subject}</Link></Td>
              <Td>{t.client.name}</Td><Td>{label(t.priority)}</Td>
              <Td><StatusBadge status={t.status} /></Td><Td>{formatDate(t.updatedAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
