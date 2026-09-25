import "server-only";
import { db } from "@/lib/db";

const MONTHLY_FACTOR = { MONTHLY: 1, QUARTERLY: 1 / 3, YEARLY: 1 / 12 } as const;

export async function getAdminMetrics() {
  const in30 = new Date(Date.now() + 30 * 86_400_000);
  const [clients, projects, activeSubs, pendingPayments, expiring, pendingDomains, openTickets] =
    await Promise.all([
      db.client.count({ where: { isActive: true } }),
      db.project.count({ where: { isActive: true } }),
      db.subscription.findMany({
        where: { status: { in: ["ACTIVE", "EXPIRING"] } },
        select: { price: true, billingCycle: true },
      }),
      db.payment.count({ where: { status: "PENDING" } }),
      db.subscription.count({
        where: { status: { in: ["ACTIVE", "EXPIRING"] }, nextBillingDate: { lte: in30 } },
      }),
      db.domainRequest.count({ where: { status: { in: ["PENDING", "CHECKING"] } } }),
      db.supportTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    ]);

  // MRR: normalise recurring cycles to monthly; ONE_TIME/CUSTOM excluded by design.
  const mrr = Math.round(
    activeSubs.reduce((sum, s) => {
      const f = MONTHLY_FACTOR[s.billingCycle as keyof typeof MONTHLY_FACTOR];
      return sum + (f ? s.price * f : 0);
    }, 0),
  );

  return {
    clients, projects, activeSubscriptions: activeSubs.length,
    mrr, pendingPayments, expiring, pendingDomains, openTickets,
  };
}
