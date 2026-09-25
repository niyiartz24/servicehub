import { notFound, redirect } from "next/navigation";
import { requireClientUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { settlePayment } from "@/server/services/settlement";

/** Where the gateway sends the client back. The query string proves nothing: we verify server-side. */
export default async function PaymentCallback({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const user = await requireClientUser();
  const { reference } = await searchParams;
  if (!reference) notFound();
  const payment = await db.payment.findFirst({ where: { reference, clientId: user.clientId }, select: { id: true } });
  if (!payment) notFound();
  await settlePayment(reference).catch((e) => console.error("Callback settle failed", e)); // detail page shows "pending" and retries
  redirect(`/payments/${payment.id}`);
}
