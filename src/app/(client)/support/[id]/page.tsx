import { notFound } from "next/navigation";
import { requireClientUser } from "@/lib/auth/session";
import { getClientTicket } from "@/server/services/tickets";
import { replyTicketAction } from "../../actions";
import { ActionForm } from "@/components/action-form";
import { TextArea } from "@/components/form-fields";
import { PageHeader } from "@/components/detail-list";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireClientUser();
  const { id } = await params;
  const t = await getClientTicket(user.clientId, id);
  if (!t) notFound();

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/support", label: "Support" }} title={t.subject} subtitle={`${t.number}${t.service ? ` · ${t.service.name}` : ""} · opened ${formatDate(t.createdAt)}`} />
      <StatusBadge status={t.status} />
      <div className="space-y-3">
        <div className="rounded-lg border border-line bg-charcoal p-4 text-sm"><p className="mb-1 text-xs text-muted">You</p><p className="whitespace-pre-wrap">{t.description}</p></div>
        {t.messages.map((m) => {
          const mine = m.author.role === "CLIENT";
          return (
            <div key={m.id} className={`rounded-lg border p-4 text-sm ${mine ? "border-line bg-charcoal" : "border-accent/30 bg-accent/5"}`}>
              <p className="mb-1 text-xs text-muted">{mine ? "You" : "SynthaxLab Support"} · {formatDate(m.createdAt)}</p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          );
        })}
      </div>
      {t.status === "CLOSED" ? (
        <p className="text-sm text-muted">This request is closed. Open a new one if you still need help.</p>
      ) : (
        <ActionForm action={replyTicketAction} submitLabel="Send reply">
          <input type="hidden" name="ticketId" value={t.id} />
          <TextArea label="Your reply" name="body" />
        </ActionForm>
      )}
    </div>
  );
}
