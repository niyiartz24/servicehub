import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getTicketAdmin } from "@/server/services/tickets";
import { adminTicketAction } from "../../ops-actions";
import { ActionForm } from "@/components/action-form";
import { Checkbox, Select, TextArea } from "@/components/form-fields";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CLIENT", "RESOLVED", "CLOSED"].map((s) => ({ value: s, label: s.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) }));

export default async function AdminTicket({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("support:manage");
  const { id } = await params;
  const t = await getTicketAdmin(id);
  if (!t) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/support" className="text-sm text-muted hover:text-ink">← Support</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.subject}</h1>
        <p className="mt-1 text-sm text-muted">
          {t.number} · <Link href={`/admin/clients/${t.client.id}`} className="hover:text-ink">{t.client.name}</Link>
          {t.project && ` · ${t.project.name}`}{t.service && ` · ${t.service.name}`} · {t.category.toLowerCase()} · {t.priority.toLowerCase()} priority
        </p>
      </div>
      <StatusBadge status={t.status} />
      <div className="space-y-3">
        <div className="rounded-lg border border-line bg-charcoal p-4 text-sm"><p className="mb-1 text-xs text-muted">Client · {formatDate(t.createdAt)}</p><p className="whitespace-pre-wrap">{t.description}</p></div>
        {t.messages.map((m) => (
          <div key={m.id} className={`rounded-lg border p-4 text-sm ${m.isInternal ? "border-amber-500/30 bg-amber-500/5" : m.author.role === "CLIENT" ? "border-line bg-charcoal" : "border-accent/30 bg-accent/5"}`}>
            <p className="mb-1 text-xs text-muted">{m.author.fullName ?? m.author.email}{m.isInternal && " · INTERNAL NOTE (client cannot see)"} · {formatDate(m.createdAt)}</p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>
      <ActionForm action={adminTicketAction} submitLabel="Update ticket">
        <input type="hidden" name="ticketId" value={t.id} />
        <TextArea label="Reply (optional if only changing status)" name="body" />
        <Checkbox label="Internal note (not visible to client)" name="isInternal" />
        <Select label="Status" name="status" defaultValue={t.status === "OPEN" ? "WAITING_FOR_CLIENT" : t.status} options={STATUSES} />
      </ActionForm>
    </div>
  );
}
