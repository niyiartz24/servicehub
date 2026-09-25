import "server-only";
import type { BillingCycle } from "@prisma/client";
import { db } from "@/lib/db";
import { brand } from "@/config/brand";
import { addCycle } from "@/lib/billing-dates";
import { UserError } from "@/server/errors";
import { audit } from "./audit";
import { nextNumber } from "./numbering";

const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/**
 * Business rule (confirm with SynthaxLab): a renewal starts at the current next-billing date.
 * If the service has already lapsed, the new period starts today, with no back-charge for the gap.
 */
export function computeRenewalPeriod(
  sub: { nextBillingDate: Date | null; billingCycle: BillingCycle; customCycleDays: number | null },
  now = new Date(),
) {
  const start = sub.nextBillingDate && sub.nextBillingDate >= now ? sub.nextBillingDate : startOfDayUTC(now);
  return { start, end: addCycle(start, sub.billingCycle, sub.customCycleDays) };
}

export async function taxRatePercent(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: "tax" } });
  const v = s?.value as { enabled?: boolean; ratePercent?: number } | null;
  return v?.enabled && v.ratePercent ? v.ratePercent : 0;
}

/** Price always comes from the subscription (custom or default), never from the browser. */
export async function createRenewalInvoice(user: { id: string; clientId: string }, subscriptionId: string) {
  const sub = await db.subscription.findFirst({
    where: { id: subscriptionId, clientId: user.clientId },
    include: { plan: true, service: { include: { serviceType: true } } },
  });
  if (!sub) throw new UserError("Subscription not found.");
  if (sub.status === "CANCELLED") throw new UserError("This subscription was cancelled. Contact SynthaxLab to reactivate it.");
  if (sub.status === "SUSPENDED") throw new UserError("This service is suspended. Contact SynthaxLab to resolve it.");
  if (sub.billingCycle === "ONE_TIME") throw new UserError("One-time services can't be renewed online.");

  const now = new Date();
  // Don't create duplicates: reuse an unpaid invoice that still covers a future period.
  const existing = await db.invoice.findFirst({
    where: { clientId: user.clientId, status: { in: ["PENDING", "OVERDUE"] }, items: { some: { subscriptionId: sub.id, periodEnd: { gt: now } } } },
  });
  if (existing) return existing;

  const { start, end } = computeRenewalPeriod(sub, now);
  if (!end) throw new UserError("This subscription needs a billing period set by SynthaxLab before it can be renewed.");

  const rate = await taxRatePercent();
  const subtotal = sub.price;
  const tax = Math.round((subtotal * rate) / 100);
  const dueDate = start > now ? start : new Date(now.getTime() + 3 * 86_400_000);

  return db.$transaction(async (tx) => {
    const number = await nextNumber(tx, "invoice", brand.invoicePrefix);
    const invoice = await tx.invoice.create({
      data: {
        number, clientId: user.clientId, projectId: sub.service.projectId,
        description: `${sub.service.serviceType.name} renewal: ${sub.service.name}`,
        periodStart: start, periodEnd: end, subtotal, tax, total: subtotal + tax, status: "PENDING", dueDate,
        items: { create: [{ subscriptionId: sub.id, description: `${sub.plan.name} (${sub.billingCycle.toLowerCase()})`, quantity: 1, unitPrice: sub.price, amount: sub.price, periodStart: start, periodEnd: end }] },
      },
    });
    await audit(tx, { actorId: user.id, action: "invoice.created", entity: "Invoice", entityId: invoice.id, metadata: { source: "client_renewal", subscriptionId: sub.id, total: invoice.total } });
    return invoice;
  });
}