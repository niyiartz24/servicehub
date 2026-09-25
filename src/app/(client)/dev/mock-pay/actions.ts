"use server";

import { notFound, redirect } from "next/navigation";
import { requireClientUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function simulateMockPayment(fd: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.PAYSTACK_SECRET_KEY) notFound();
  const user = await requireClientUser();
  const reference = String(fd.get("reference") ?? "");
  const outcome = fd.get("outcome") === "success" ? "success" : "failed";
  const r = await db.payment.updateMany({
    where: { reference, clientId: user.clientId, gateway: "mock", status: "PENDING" },
    data: { rawGatewayData: { mock: true, mockOutcome: outcome } },
  });
  if (r.count === 0) notFound();
  redirect(`/payments/callback?reference=${encodeURIComponent(reference)}`);
}
