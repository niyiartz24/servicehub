import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { brand, formatNaira } from "@/config/brand";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/server/errors";
import { audit } from "./audit";
import { nextNumber } from "./numbering";
import { notifyAdmins, notifyClient } from "./notifications";
import { applyPaid } from "./settlement";

const BUCKET = "payment-proofs"; // PRIVATE bucket. Never make it public.
const MAX_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { ext: string; mime: string; magic: number[] }[] = [
  { ext: "pdf", mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  { ext: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
];

/** Checks size and real file signature, not just the browser-supplied MIME type. */
async function readProof(file: File) {
  if (file.size > MAX_BYTES) throw new UserError("Proof of payment must be 5 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = SIGNATURES.find((t) => t.magic.every((b, i) => buf[i] === b));
  if (!type) throw new UserError("Proof must be a PDF, PNG or JPG file.");
  return { buf, type };
}

export async function submitManualPayment(
  user: { id: string; clientId: string },
  input: { invoiceId: string; declaredAmount: number; transferReference: string },
  file: File | null,
) {
  const invoice = await db.invoice.findFirst({ where: { id: input.invoiceId, clientId: user.clientId } });
  if (!invoice) throw new UserError("Invoice not found.");
  if (invoice.status !== "PENDING" && invoice.status !== "OVERDUE") throw new UserError("This invoice can't be paid.");
  const open = await db.payment.count({ where: { invoiceId: invoice.id, method: "BANK_TRANSFER_MANUAL", status: "PENDING" } });
  if (open > 0) throw new UserError("You already submitted a transfer for this invoice. We will review it shortly.");

  let path: string | null = null;
  if (file && file.size > 0) {
    const { buf, type } = await readProof(file);
    path = `${user.clientId}/${randomUUID()}.${type.ext}`;
    const { error } = await createAdminClient().storage.from(BUCKET).upload(path, buf, { contentType: type.mime, upsert: false });
    if (error) { console.error("Proof upload failed", error); throw new UserError("We couldn't upload your proof. Please try again."); }
  }

  try {
    return await db.$transaction(async (tx) => {
      const reference = await nextNumber(tx, "payment", brand.paymentPrefix);
      const payment = await tx.payment.create({
        data: {
          reference, invoiceId: invoice.id, clientId: user.clientId, amount: invoice.total, currency: invoice.currency,
          method: "BANK_TRANSFER_MANUAL", status: "PENDING", gateway: "manual",
          manualProof: { create: { declaredAmount: input.declaredAmount, transferReference: input.transferReference, proofStoragePath: path } },
        },
      });
      await audit(tx, { actorId: user.id, action: "payment.manual_submitted", entity: "Payment", entityId: payment.id, metadata: { invoiceId: invoice.id, declaredAmount: input.declaredAmount } });
      await notifyAdmins(tx, { type: "SYSTEM", title: "Bank transfer awaiting review", body: `${reference}: ${formatNaira(input.declaredAmount)} declared for ${invoice.number}.`, link: "/admin/payments?status=PENDING" });
      return payment;
    });
  } catch (e) {
    if (path) await createAdminClient().storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw e;
  }
}

/** Admin confirms they SAW the money: they type the amount received, which must equal the invoice total. */
export async function approveManualPayment(actorId: string, paymentId: string, amountReceived: number, note?: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { invoice: { include: { items: true } }, manualProof: true } });
    if (!payment || payment.method !== "BANK_TRANSFER_MANUAL" || !payment.manualProof) throw new UserError("Manual payment not found.");
    if (payment.status !== "PENDING" || payment.manualProof.status !== "SUBMITTED") throw new UserError("This payment has already been reviewed.");
    if (amountReceived !== payment.amount) {
      throw new UserError(`Amount received (${formatNaira(amountReceived)}) must equal the invoice total (${formatNaira(payment.amount)}). Reject it and ask the client to resubmit if they underpaid.`);
    }
    const outcome = await applyPaid(tx, payment, { manual: true, transferReference: payment.manualProof.transferReference, approvedBy: actorId }, actorId);
    await tx.manualPaymentProof.update({ where: { paymentId }, data: { status: "APPROVED", reviewedById: actorId, reviewedAt: new Date(), reviewNote: note ?? null } });
    return outcome;
  });
}

export async function rejectManualPayment(actorId: string, paymentId: string, note: string) {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { manualProof: true } });
    if (!payment || payment.method !== "BANK_TRANSFER_MANUAL" || !payment.manualProof) throw new UserError("Manual payment not found.");
    if (payment.status !== "PENDING" || payment.manualProof.status !== "SUBMITTED") throw new UserError("This payment has already been reviewed.");
    await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED", failureReason: "manual_rejected" } });
    await tx.manualPaymentProof.update({ where: { paymentId }, data: { status: "REJECTED", reviewedById: actorId, reviewedAt: new Date(), reviewNote: note } });
    await audit(tx, { actorId, action: "payment.rejected", entity: "Payment", entityId: paymentId, metadata: { note } });
    await notifyClient(tx, payment.clientId, { type: "PAYMENT_FAILED", title: "Bank transfer not confirmed", body: `We couldn't confirm ${payment.reference}: ${note}`, link: `/invoices/${payment.invoiceId}` });
  });
}

/** Short-lived link for admins to view a proof. Bucket stays private. */
export async function proofSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
