import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listClients } from "@/server/services/clients";
import { createClientAction } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Checkbox, Field, TextArea } from "@/components/form-fields";
import { Disclosure, Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin("clients:manage");
  const { q } = await searchParams;
  const clients = await listClients(q?.trim() || undefined);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>

      <Disclosure summary="Create client">
        <ActionForm action={createClientAction} submitLabel="Create client">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client / business name" name="name" required />
            <Field label="Contact name" name="contactName" />
            <Field label="Email" name="email" type="email" required />
            <Field label="Phone" name="phone" type="tel" />
          </div>
          <Field label="Address" name="address" />
          <TextArea label="Internal notes" name="notes" />
          <Checkbox label="Send portal invite to this email" name="sendInvite" />
        </ActionForm>
      </Disclosure>

      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">Search clients</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name or email"
          className="w-full max-w-sm rounded-md border border-line bg-charcoal px-3 py-2 text-sm" />
        <button className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface">Search</button>
      </form>

      <Table empty={clients.length === 0 ? (q ? "No clients match your search." : "No clients yet.") : undefined}>
        <thead><tr><Th>Client</Th><Th>Email</Th><Th>Projects</Th><Th>Active subs</Th><Th>Status</Th><Th>Created</Th></tr></thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <Td>
                <Link href={`/admin/clients/${c.id}`} className="font-medium hover:text-accent-soft">{c.name}</Link>
                {c.isDemo && <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">DEMO</span>}
              </Td>
              <Td>{c.email}</Td>
              <Td>{c._count.projects}</Td>
              <Td>{c._count.subscriptions}</Td>
              <Td><StatusBadge status={c.isActive ? "ACTIVE" : "SUSPENDED"} /></Td>
              <Td>{formatDate(c.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
