import Link from "next/link";
import type { NotificationType } from "@prisma/client";
import { Bell, CalendarClock, CheckCircle2, CreditCard, Globe, LifeBuoy, TriangleAlert } from "lucide-react";
import { markAllReadAction, markReadAction } from "@/app/notifications-actions";
import { formatDate } from "@/lib/format";

type Item = { id: string; type: NotificationType; title: string; body: string; link: string | null; readAt: Date | null; createdAt: Date };

const ICON = {
  RENEWAL_REMINDER: CalendarClock, PAYMENT_SUCCESS: CheckCircle2, PAYMENT_FAILED: CreditCard,
  SERVICE_EXPIRED: TriangleAlert, DOMAIN_REQUEST_UPDATE: Globe, TICKET_UPDATE: LifeBuoy, SYSTEM: Bell,
} as const;

export function NotificationList({ items }: { items: Item[] }) {
  const unread = items.filter((i) => !i.readAt).length;
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-muted">You&apos;re all caught up. No notifications yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted" aria-live="polite">{unread > 0 ? `${unread} unread` : "All read"}</p>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface">Mark all as read</button>
          </form>
        )}
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line bg-charcoal">
        {items.map((n) => {
          const Icon = ICON[n.type];
          return (
            <li key={n.id} className={`flex gap-3 p-4 ${n.readAt ? "" : "bg-accent/5"}`}>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${n.readAt ? "text-muted" : "text-accent-soft"}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}{!n.readAt && <span className="sr-only"> (unread)</span>}</p>
                <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                  <time dateTime={n.createdAt.toISOString()}>{formatDate(n.createdAt)}</time>
                  {n.link && <Link href={n.link} className="text-accent-soft hover:underline">View</Link>}
                  {!n.readAt && (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="hover:text-ink">Mark as read</button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
