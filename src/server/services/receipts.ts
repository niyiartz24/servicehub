import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/roles";
import { methodLabel } from "@/lib/format";

export type ReceiptData = {
  receiptNumber: string;
  paidAt: Date;
  method: string;
  invoiceNumber: string;
  invoiceDescription: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  clientName: string;
  clientEmail: string;
  items: { description: string; quantity: number; unitPrice: number; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
};

/**
 * Returns null (→ 404 in the route) rather than throwing, so we never leak whether a payment
 * exists to someone who isn't allowed to see it. Only PAID payments get a receipt.
 */
export async function getReceiptData(
  paymentId: string,
  viewer: { role: Role; clientId: string | null },
): Promise<ReceiptData | null> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { client: { select: { name: true, email: true } }, invoice: { include: { items: true } } },
  });
  if (!payment || payment.status !== "PAID") return null;
  if (!isAdminRole(viewer.role) && payment.clientId !== viewer.clientId) return null;

  return {
    receiptNumber: payment.reference,
    paidAt: payment.verifiedAt ?? payment.createdAt,
    method: methodLabel[payment.method] ?? payment.method,
    invoiceNumber: payment.invoice.number,
    invoiceDescription: payment.invoice.description,
    periodStart: payment.invoice.periodStart,
    periodEnd: payment.invoice.periodEnd,
    clientName: payment.client.name,
    clientEmail: payment.client.email,
    items: payment.invoice.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.amount })),
    subtotal: payment.invoice.subtotal,
    tax: payment.invoice.tax,
    total: payment.invoice.total,
    currency: payment.invoice.currency,
  };
}