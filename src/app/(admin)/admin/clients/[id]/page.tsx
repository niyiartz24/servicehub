import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getClientDetail } from "@/server/services/clients";
import { createProjectAction, setClientActiveAction, updateClientAction } from "../../actions";
import { ActionForm } from "@/components/action-form";
import { ConfirmForm } from "@/components/confirm-form";
import { Field, TextArea } from "@/components/form-fields";
import { Disclosure, Section, Table, Td, Th } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { cycleLabel, formatDate } from "@/lib/format";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("clients:manage");
  const { id } = await params;
  const c = await getClientDetail(id);
  if (!c) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[c.contactName, c.email, c.phone].filter(Boolean).join(" · ")}
          </p>
          {c.isDemo && <p className="mt-2 text-xs text-amber-300">Demo record: not real client data.</p>}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={c.isActive ? "ACTIVE" : "SUSPENDED"} />
          <ConfirmForm
            action={setClientActiveAction}
            hidden={{ id: c.id, active: String(!c.isActive) }}
            label={c.isActive ? "Deactivate" : "Reactivate"}
            danger={c.isActive}
            message={c.isActive ? "Deactivate this client? Their users will be unable to sign in." : "Reactivate this client and their users?"}
          />
        </div>
      </div>

      <Disclosure summary="Edit contact information">
        <ActionForm action={updateClientAction} submitLabel="Save changes">
          <input type="hidden" name="id" value={c.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client / business name" name="name" required defaultValue={c.name} />
            <Field label="Contact name" name="contactName" defaultValue={c.contactName ?? ""} />
            <Field label="Email" name="email" type="email" required defaultValue={c.email} />
            <Field label="Phone" name="phone" defaultValue={c.phone ?? ""} />
          </div>
          <Field label="Address" name="address" defaultValue={c.address ?? ""} />
          <TextArea label="Internal notes" name="notes" defaultValue={c.notes ?? ""} />
        </ActionForm>
      </Disclosure>

      <Section title="Portal users">
        {c.users.length === 0 ? (
          <p className="text-sm text-muted">No portal users yet. Create the client with an invite, or link a user manually.</p>
        ) : (
          <ul className="text-sm text-muted">{c.users.map((u) => <li key={u.id}>{u.email} {!u.isActive && "(inactive)"}</li>)}</ul>
        )}
      </Section>

      <Section title="Projects">
        <Table empty={c.projects.length === 0 ? "No projects yet." : undefined}>
          <thead><tr><Th>Name</Th><Th>URL</Th><Th>Created</Th></tr></thead>
          <tbody>{c.projects.map((p) => <tr key={p.id}><Td>{p.name}</Td><Td>{p.primaryUrl ?? "—"}</Td><Td>{formatDate(p.createdAt)}</Td></tr>)}</tbody>
        </Table>
        <Disclosure summary="Add project">
          <ActionForm action={createProjectAction} submitLabel="Add project">
            <input type="hidden" name="clientId" value={c.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" name="name" required placeholder="ravers.ng" />
              <Field label="Primary URL" name="primaryUrl" type="url" placeholder="https://ravers.ng" />
            </div>
            <Field label="Description" name="description" />
          </ActionForm>
        </Disclosure>
      </Section>

      <Section title="Subscriptions">
        <Table empty={c.subscriptions.length === 0 ? "No subscriptions yet." : undefined}>
          <thead><tr><Th>Service</Th><Th>Project</Th><Th>Price</Th><Th>Default</Th><Th>Next billing</Th><Th>Status</Th></tr></thead>
          <tbody>
            {c.subscriptions.map((s) => (
              <tr key={s.id}>
                <Td><Link href={`/admin/subscriptions/${s.id}`} className="hover:text-accent-soft">{s.service.name}</Link>
                  <p className="text-xs text-muted">{s.service.serviceType.name} · {s.plan.name}</p></Td>
                <Td>{s.service.project.name}</Td>
                <Td>{formatNaira(s.price)}/{cycleLabel[s.billingCycle]}{s.isCustomPrice && <span className="ml-1 text-xs text-accent-soft">custom</span>}</Td>
                <Td className="text-muted">{formatNaira(s.defaultPriceAtSet)}</Td>
                <Td>{formatDate(s.nextBillingDate)}</Td>
                <Td><StatusBadge status={s.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Recent invoices">
        <Table empty={c.invoices.length === 0 ? "No invoices yet." : undefined}>
          <thead><tr><Th>Number</Th><Th>Description</Th><Th>Amount</Th><Th>Status</Th><Th>Due</Th></tr></thead>
          <tbody>{c.invoices.map((i) => <tr key={i.id}><Td>{i.number}</Td><Td>{i.description}</Td><Td>{formatNaira(i.total)}</Td><Td><StatusBadge status={i.status} /></Td><Td>{formatDate(i.dueDate)}</Td></tr>)}</tbody>
        </Table>
      </Section>

      <Section title="Recent payments">
        <Table empty={c.payments.length === 0 ? "No payments yet." : undefined}>
          <thead><tr><Th>Reference</Th><Th>Invoice</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th></tr></thead>
          <tbody>{c.payments.map((p) => <tr key={p.id}><Td>{p.reference}</Td><Td>{p.invoice.number}</Td><Td>{formatNaira(p.amount)}</Td><Td><StatusBadge status={p.status} /></Td><Td>{formatDate(p.createdAt)}</Td></tr>)}</tbody>
        </Table>
      </Section>

      <Section title="Support history">
        <Table empty={c.tickets.length === 0 ? "No support requests." : undefined}>
          <thead><tr><Th>Number</Th><Th>Subject</Th><Th>Category</Th><Th>Status</Th><Th>Opened</Th></tr></thead>
          <tbody>{c.tickets.map((t) => <tr key={t.id}><Td>{t.number}</Td><Td>{t.subject}</Td><Td>{t.category}</Td><Td><StatusBadge status={t.status} /></Td><Td>{formatDate(t.createdAt)}</Td></tr>)}</tbody>
        </Table>
      </Section>
    </div>
  );
}
