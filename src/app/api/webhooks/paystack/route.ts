import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/server/payments/paystack";
import { settlePayment } from "@/server/services/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaystackEvent = { event: string; data?: { id?: number; reference?: string; status?: string; amount?: number; currency?: string; channel?: string } };

export async function POST(req: Request) {
  if (!process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text(); // signature is over the exact raw body
  const signature = req.headers.get("x-paystack-signature");
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let evt: PaystackEvent;
  try { evt = JSON.parse(raw) as PaystackEvent; } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const eventId = `${evt.event}:${evt.data?.id ?? evt.data?.reference ?? "unknown"}`;
  const key = { provider_eventId: { provider: "paystack", eventId } };

  // Idempotency: record first. A replay of an already-processed event is acknowledged and ignored.
  try {
    await db.webhookEvent.create({
      data: {
        provider: "paystack", eventId, eventType: evt.event,
        // Store only non-sensitive fields, never customer or card details.
        payload: { event: evt.event, data: { id: evt.data?.id ?? null, reference: evt.data?.reference ?? null, status: evt.data?.status ?? null, amount: evt.data?.amount ?? null, currency: evt.data?.currency ?? null, channel: evt.data?.channel ?? null } },
      },
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    const prior = await db.webhookEvent.findUnique({ where: key });
    if (prior?.processedAt) return NextResponse.json({ ok: true, duplicate: true });
    // Previously received but failed mid-way: fall through and retry.
  }

  if (evt.event !== "charge.success" || !evt.data?.reference) {
    await db.webhookEvent.update({ where: key, data: { processedAt: new Date() } });
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    // We do NOT trust the payload's status. settlePayment re-verifies with Paystack's API.
    const outcome = await settlePayment(evt.data.reference);
    await db.webhookEvent.update({ where: key, data: { processedAt: new Date(), error: outcome === "unknown_reference" ? "unknown_reference" : null } });
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    console.error("Paystack webhook processing failed", e);
    await db.webhookEvent.update({ where: key, data: { error: e instanceof Error ? e.message.slice(0, 300) : "error" } });
    return NextResponse.json({ error: "processing failed" }, { status: 500 }); // Paystack will retry
  }
}
