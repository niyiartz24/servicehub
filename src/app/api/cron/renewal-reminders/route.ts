import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/safe-equal";
import { flushPendingEmails } from "@/server/email/dispatch";
import { runRenewalReminders } from "@/server/services/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Nothing else may. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const reminders = await runRenewalReminders();
  const emails = await flushPendingEmails(200);
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return NextResponse.json({ ok: true, ms: Date.now() - started, reminders, emails });
}
