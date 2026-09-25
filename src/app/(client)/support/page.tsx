import Link from "next/link";
import { requireClientUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listClientTickets } from "@/server/services/tickets";
import { createTicketAction } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Field, Select, TextArea } from "@/components/form-fields";
import { PageHeader } from "@/components/detail-list";
import { Disclosure, Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Support" };
const CATEGORIES = ["DOMAIN", "HOSTING", "DATABASE", "WEBSITE", "PAYMENT", "ACCOUNT", "OTHER"].map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }));
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"].map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }));
const CATEGORY_BY_TYPE: Record<string, string> = { DOMAIN: "DOMAIN", HOSTING: "HOSTING", DATABASE: "DATABASE" };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ service?: string; topic?: string }> }) {
  const user = await requireClientUser();
  const { service, topic } = await searchParams;
  const tickets = await listClientTickets(user.clientId);

  // Prefill from a service page. Ownership is verified; the URL alone grants nothing.
  const svc = service
    ? await db.service.findFirst({ where: { id: service, project: { clientId: user.clientId } }, select: { id: true, name: true, serviceType: { select: { code: true } } } })
    : null;
  const subject = svc ? (topic === "upgrade" ? `Upgrade request: ${svc.name}` : `Help with ${svc.name}`) : "";

  return (
    <div className="space-y-8">
      <PageHeader title="Support" subtitle="Ask SynthaxLab for help, upgrades or changes." />
      <Disclosure summary="New support request">
        {/* key forces the form to remount with fresh defaults when the prefill changes */}
        <div key={svc?.id ?? "none"}>
          <ActionForm action={createTicketAction} submitLabel="Submit request">
            {svc && <input type="hidden" name="serviceId" value={svc.id} />}
            <Field label="Subject" name="subject" required defaultValue={subject} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" name="category" defaultValue={svc ? CATEGORY_BY_TYPE[svc.serviceType.code] ?? "OTHER" : "OTHER"} options={CATEGORIES} />
              <Select label="Priority" name="priority" defaultValue="MEDIUM" options={PRIORITIES} />
            </div>
            <TextArea label="Describe what you need" name="description" />
          </ActionForm>
        </div>
      </Disclosure>
      <Table empty={tickets.length === 0 ? "No support requests yet." : undefined}>
        <thead><tr><Th>Number</Th><Th>Subject</Th><Th>Category</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <Td>{t.number}</Td>
              <Td><Link href={`/support/${t.id}`} className="font-medium hover:text-accent-soft">{t.subject}</Link></Td>
              <Td>{t.category.charAt(0) + t.category.slice(1).toLowerCase()}</Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td>{formatDate(t.updatedAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
