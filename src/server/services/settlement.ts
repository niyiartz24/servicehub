import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatNaira } from "@/config/brand";
import { getGatewayByName } from "@/server/payments";
import { audit } from "./audit";
import { notifyAdmins, notifyClient } from "./notifications";

export type SettleOutcome = "paid" | "already_paid" | "pending" | "failed" | "mismatch" | "duplicate" | "unknown_reference";
export type PaymentWithItems = Prisma.PaymentGetPayload<{ include: { invoice: { include: { items: true } } } }>;

const REACTIVATE = ["ACTIVE", "EXPIRING", "EXPIRED", "PENDING"];

/**
 * Applies a confirmed payment. Used by gateway settlement AND admin approval of manual transfers,
 * so both go through identical, atomic logic: claim payment → invoice PAID → extend subscriptions → audit → notify.
 * `actorId` is set only for human approvals.
 */
export async function applyPaid(
  tx: Prisma.TransactionClient,
  payment: PaymentWithItems,
  raw: Prisma.InputJsonObject | null,
  actorId: string | null = null,
): Promise<SettleOutcome> {
  const claimed = await tx.payment.updateMany({
    where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PAID", verifiedAt: new Date(), failureReason: null, rawGatewayData: raw ?? undefined },
  });
  if (claimed.count === 0) return "already_paid";

  const inv = await tx.invoice.updateMany({
    where: { id: payment.invoiceId, status: { in: ["PENDING", "OVERDUE"] } },
    data: { status: "PAID", paidAt: new Date() },
  });
  if (inv.count === 0) {
    await audit(tx, { actorId, action: "payment.duplicate", entity: "Payment", entityId: payment.id, metadata: { invoiceId: payment.invoiceId, amount: payment.amount } });
    await notifyAdmins(tx, { type: "SYSTEM", title: "Duplicate payment received", body: `${payment.reference} (${formatNaira(payment.amount)}) was paid against an invoice that was already settled. Review for refund.`, link: "/admin/payments" });
    return "duplicate";
  }

  for (const item of payment.invoice.items) {
    if (!item.subscriptionId || !item.periodEnd) continue;
    const sub = await tx.subscription.findUnique({ where: { id: item.subscriptionId } });
    if (!sub) continue;
    const extend = !sub.nextBillingDate || item.periodEnd > sub.nextBillingDate; // never move backwards
    await tx.subscription.update({
      where: { id: sub.id },
      data: { ...(extend ? { nextBillingDate: item.periodEnd } : {}), ...(REACTIVATE.includes(sub.status) ? { status: "ACTIVE" } : {}) },
    });
    await audit(tx, {
      actorId, action: "subscription.extended", entity: "Subscription", entityId: sub.id,
      metadata: { paymentReference: payment.reference, invoiceId: payment.invoiceId, from: sub.nextBillingDate?.toISOString() ?? null, to: extend ? item.periodEnd.toISOString() : null, statusBefore: sub.status },
    });
    if (!REACTIVATE.includes(sub.status)) {
      await notifyAdmins(tx, { type: "SYSTEM", title: `Payment received for ${sub.status.toLowerCase()} subscription`, body: `${payment.reference} paid. Status left as ${sub.status}; decide whether to reactivate.`, link: `/admin/subscriptions/${sub.id}` });
    }
  }

  // A paid domain-registration invoice means SynthaxLab can now purchase the domain.
  const dr = await tx.domainRequest.findFirst({ where: { invoiceId: payment.invoiceId } });
  if (dr) {
    await notifyAdmins(tx, { type: "DOMAIN_REQUEST_UPDATE", title: "Domain payment received", body: `${dr.domain} is paid for. Purchase and configure it, then mark it Active.`, link: "/admin/domains" });
  }

  await audit(tx, { actorId, action: actorId ? "payment.approved" : "payment.verified", entity: "Payment", entityId: payment.id, metadata: { reference: payment.reference, invoiceId: payment.invoiceId, amount: payment.amount, gateway: payment.gateway } });
  await notifyClient(tx, payment.clientId, {
    type: "PAYMENT_SUCCESS", title: "Payment successful",
    body: `Your payment of ${formatNaira(payment.amount)} was successful. Reference ${payment.reference}.`,
    link: `/payments/${payment.id}`,
  });
  return "paid";
}

/**
 * Gateway settlement, called by the webhook and the post-checkout page.
 * Asks the gateway for the truth, checks amount/currency, then applies it exactly once.
 */
export async function settlePayment(reference: string): Promise<SettleOutcome> {
  const payment = await db.payment.findUnique({ where: { reference }, include: { invoice: { include: { items: true } } } });
  if (!payment) return "unknown_reference";
  if (payment.status === "PAID" || payment.status === "REFUNDED") return "already_paid";
  if (payment.gateway === "manual") return "pending"; // manual transfers are settled only by an admin

  const result = await getGatewayByName(payment.gateway).verify(reference);
  if (result.status === "pending") return "pending";

  if (result.status === "failed") {
    const n = await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED", failureReason: "Declined or abandoned at gateway", rawGatewayData: result.raw ?? undefined },
    });
    if (n.count) {
      await notifyClient(db, payment.clientId, {
        type: "PAYMENT_FAILED", title: "Payment not completed",
        body: `Your payment of ${formatNaira(payment.amount)} (${payment.reference}) was not completed. You can try again from the invoice.`,
        link: `/invoices/${payment.invoiceId}`,
      });
    }
    return "failed";
  }

  if (result.amountKobo !== payment.amount || result.currency !== payment.currency) {
    await db.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
        data: { status: "FAILED", failureReason: "amount_or_currency_mismatch", rawGatewayData: result.raw ?? undefined },
      });
      await audit(tx, { actorId: null, action: "payment.mismatch", entity: "Payment", entityId: payment.id, metadata: { expected: payment.amount, received: result.amountKobo, currency: result.currency } });
      await notifyAdmins(tx, { type: "SYSTEM", title: "Payment amount mismatch", body: `${payment.reference}: expected ${formatNaira(payment.amount)}, gateway reported ${formatNaira(result.amountKobo)}. Needs manual review.`, link: "/admin/payments" });
    });
    return "mismatch";
  }

  return db.$transaction((tx) => applyPaid(tx, payment, result.raw));
}
