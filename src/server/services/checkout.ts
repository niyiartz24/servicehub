import "server-only";
import { db } from "@/lib/db";
import { brand } from "@/config/brand";
import { UserError } from "@/server/errors";
import { getGateway } from "@/server/payments";
import { nextNumber } from "./numbering";

export type OnlineMethod = "CARD" | "BANK_TRANSFER_PAYSTACK";

/** Creates a PENDING payment and returns the gateway URL. Nothing is marked paid here. */
export async function startInvoicePayment(user: { email: string; clientId: string }, invoiceId: string, method: OnlineMethod): Promise<string> {
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, clientId: user.clientId } });
  if (!invoice) throw new UserError("Invoice not found.");
  if (invoice.status !== "PENDING" && invoice.status !== "OVERDUE") throw new UserError("This invoice can't be paid online.");
  if (invoice.total <= 0) throw new UserError("This invoice has nothing to pay.");

  const gateway = getGateway();
  const payment = await db.$transaction(async (tx) => {
    const reference = await nextNumber(tx, "payment", brand.paymentPrefix);
    return tx.payment.create({
      data: { reference, invoiceId: invoice.id, clientId: user.clientId, amount: invoice.total, currency: invoice.currency, method, status: "PENDING", gateway: gateway.name },
    });
  });

  try {
    const init = await gateway.initialize({
      reference: payment.reference, email: user.email, amountKobo: payment.amount,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback?reference=${encodeURIComponent(payment.reference)}`,
      channels: method === "CARD" ? ["card"] : ["bank_transfer"],
      metadata: { invoiceId: invoice.id, clientId: user.clientId },
    });
    await db.payment.update({ where: { id: payment.id }, data: { gatewayRef: init.gatewayRef } });
    return init.authorizationUrl;
  } catch (e) {
    console.error("Payment initialize failed", e);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "initialize_failed" } });
    throw new UserError("We couldn't start the payment. Please try again in a moment.");
  }
}
