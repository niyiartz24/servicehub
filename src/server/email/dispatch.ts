import "server-only";
import { db } from "@/lib/db";
import { notificationEmail } from "./templates";
import { sendEmail } from "./resend";

const MAX_ATTEMPTS = 3;
const STALE_MS = 48 * 3600_000; // never email something that is days old
const CLAIM_TIMEOUT_MS = 15 * 60_000;

let running = false;

/**
 * Email outbox. Notifications are created inside DB transactions; emails are sent AFTER commit from here,
 * so a rolled-back change can never produce an email, and a Resend outage can never break a payment.
 * Safe to call concurrently: each row is claimed atomically before sending.
 */
export async function flushPendingEmails(limit = 50): Promise<{ sent: number; skipped: number; failed: number }> {
  const out = { sent: 0, skipped: 0, failed: 0 };
  if (running) return out;
  running = true;
  try {
    const now = Date.now();
    const claimable = {
      OR: [
        { emailStatus: "PENDING" },
        { emailStatus: "SENDING", emailClaimedAt: { lt: new Date(now - CLAIM_TIMEOUT_MS) } },
      ],
    };
    const rows = await db.notification.findMany({
      where: claimable, orderBy: { createdAt: "asc" }, take: limit,
      include: { user: { select: { email: true, isActive: true, emailNotifications: true } } },
    });

    for (const n of rows) {
      const claim = await db.notification.updateMany({
        where: { id: n.id, ...claimable },
        data: { emailStatus: "SENDING", emailClaimedAt: new Date(), emailAttempts: { increment: 1 } },
      });
      if (claim.count === 0) continue; // another worker has it

      if (!n.user.isActive || !n.user.emailNotifications || now - n.createdAt.getTime() > STALE_MS) {
        await db.notification.update({ where: { id: n.id }, data: { emailStatus: "SKIPPED" } });
        out.skipped++;
        continue;
      }

      const res = await sendEmail({ to: n.user.email, ...notificationEmail(n) });
      if (res.sent) {
        await db.notification.update({ where: { id: n.id }, data: { emailStatus: "SENT", emailedAt: new Date() } });
        out.sent++;
      } else if (res.reason === "not_configured") {
        await db.notification.update({ where: { id: n.id }, data: { emailStatus: "SKIPPED" } });
        out.skipped++;
      } else {
        const giveUp = n.emailAttempts + 1 >= MAX_ATTEMPTS;
        console.error(`Email failed for notification ${n.id}: ${res.error}`);
        await db.notification.update({ where: { id: n.id }, data: { emailStatus: giveUp ? "FAILED" : "PENDING" } });
        out.failed++;
      }
      await new Promise((r) => setTimeout(r, 550)); // stay under Resend's default 2 req/s
    }
    return out;
  } finally {
    running = false;
  }
}
