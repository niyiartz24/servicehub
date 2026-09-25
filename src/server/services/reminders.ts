import "server-only";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { reminderStage } from "@/lib/reminder-stage";
import { audit } from "./audit";
import { notifyAdmins, notifyClient } from "./notifications";

const DAY = 86_400_000;
const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export async function runRenewalReminders(now = new Date()) {
  const today = startOfDayUTC(now);
  const summary = { checked: 0, reminders: 0, madeExpiring: 0, madeExpired: 0, invoicesOverdue: 0, errors: 0 };

  const subs = await db.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRING", "EXPIRED"] },
      billingCycle: { not: "ONE_TIME" },
      nextBillingDate: { not: null, lte: new Date(today.getTime() + 15 * DAY), gte: new Date(today.getTime() - 30 * DAY) },
    },
    include: { service: { select: { id: true, name: true, serviceType: { select: { name: true } } } } },
  });
  summary.checked = subs.length;
  const newlyExpired: string[] = [];

  for (const sub of subs) {
    if (!sub.nextBillingDate) continue;
    try {
      const diff = Math.round((startOfDayUTC(sub.nextBillingDate).getTime() - today.getTime()) / DAY);
      const stage = reminderStage(diff);
      // Status only ever moves forward here: ACTIVE → EXPIRING → EXPIRED. Payment moves it back (settlement).
      const target = diff < 0 ? "EXPIRED" : diff <= 14 ? "EXPIRING" : "ACTIVE";
      const advance = (sub.status === "ACTIVE" && target !== "ACTIVE") || (sub.status === "EXPIRING" && target === "EXPIRED");
      const label = `${sub.service.serviceType.name.toLowerCase()} subscription (${sub.service.name})`;
      const link = `/services/${sub.service.id}?action=renew`;

      await db.$transaction(async (tx) => {
        if (advance) {
          await tx.subscription.update({ where: { id: sub.id }, data: { status: target } });
          await audit(tx, { actorId: null, action: "subscription.status_auto_changed", entity: "Subscription", entityId: sub.id, metadata: { from: sub.status, to: target, nextBillingDate: sub.nextBillingDate!.toISOString() } });
        }
        if (!stage) return;
        // Unique (subscription, stage, billing date): the DB guarantees each reminder is sent once per cycle.
        const logged = await tx.reminderLog.createMany({ data: [{ subscriptionId: sub.id, stage, billingDate: sub.nextBillingDate! }], skipDuplicates: true });
        if (logged.count === 0) return;

        const when = formatDate(sub.nextBillingDate);
        if (stage === "T+1") {
          await notifyClient(tx, sub.clientId, { type: "SERVICE_EXPIRED", title: "Subscription expired", body: `Your ${label} expired on ${when}. Renew now to restore uninterrupted service.`, link });
        } else if (stage === "T-0") {
          await notifyClient(tx, sub.clientId, { type: "RENEWAL_REMINDER", title: "Renewal due today", body: `Your ${label} is due for renewal today (${when}).`, link });
        } else {
          await notifyClient(tx, sub.clientId, { type: "RENEWAL_REMINDER", title: `Renewal due in ${diff} days`, body: `Your ${label} expires in ${diff} days (${when}). Renew now to avoid interruption.`, link });
        }
        summary.reminders++;
      });

      if (advance && target === "EXPIRING") summary.madeExpiring++;
      if (advance && target === "EXPIRED") { summary.madeExpired++; newlyExpired.push(`${sub.service.name}`); }
    } catch (e) {
      summary.errors++;
      console.error(`Reminder processing failed for subscription ${sub.id}`, e);
    }
  }

  if (newlyExpired.length) {
    await notifyAdmins(db, { type: "SYSTEM", title: `${newlyExpired.length} subscription(s) expired`, body: newlyExpired.slice(0, 5).join(", ") + (newlyExpired.length > 5 ? "…" : ""), link: "/admin/subscriptions" });
  }

  // Unpaid invoices past their due date become OVERDUE.
  summary.invoicesOverdue = (await db.invoice.updateMany({ where: { status: "PENDING", dueDate: { lt: now } }, data: { status: "OVERDUE" } })).count;
  return summary;
}
