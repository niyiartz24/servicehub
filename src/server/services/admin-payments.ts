import "server-only";
import type { InvoiceStatus, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { proofSignedUrl } from "./manual-payments";

export async function listPayments(opts: { status?: PaymentStatus; q?: string }) {
  const q = opts.q?.trim();
  const where: Prisma.PaymentWhereInput = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(q ? { OR: [
      { reference: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { invoice: { number: { contains: q, mode: "insensitive" } } },
      { invoice: { description: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };
  const rows = await db.payment.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    include: { client: { select: { id: true, name: true } }, invoice: { select: { number: true, description: true } }, manualProof: true },
  });
  // Signed proof URLs only for items still awaiting review.
  return Promise.all(rows.map(async (r) => ({
    ...r,
    proofUrl: r.manualProof?.status === "SUBMITTED" ? await proofSignedUrl(r.manualProof.proofStoragePath) : null,
  })));
}

export const listInvoices = (opts: { status?: InvoiceStatus; q?: string }) => {
  const q = opts.q?.trim();
  return db.invoice.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { client: { name: { contains: q, mode: "insensitive" } } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }, take: 200,
  });
};
