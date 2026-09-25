import "server-only";
import { db } from "@/lib/db";
import type { PaymentGateway } from "./types";

/**
 * DEVELOPMENT ONLY. Active when PAYSTACK_SECRET_KEY is unset and NODE_ENV !== "production".
 * No money moves. Payments made through it are stored with gateway = "mock" so they are obvious.
 * It goes through the SAME initialize → verify → settle pipeline as real payments;
 * the "outcome" is simply chosen by the developer on /dev/mock-pay.
 */
export const mockGateway: PaymentGateway = {
  name: "mock",

  async initialize({ reference }) {
    return {
      authorizationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dev/mock-pay?reference=${encodeURIComponent(reference)}`,
      gatewayRef: `mock_${reference}`,
    };
  },

  async verify(reference) {
    const p = await db.payment.findUnique({ where: { reference }, select: { amount: true, currency: true, rawGatewayData: true } });
    const outcome = (p?.rawGatewayData as { mockOutcome?: string } | null)?.mockOutcome;
    return {
      status: outcome === "success" ? "success" : outcome === "failed" ? "failed" : "pending",
      amountKobo: p?.amount ?? 0,
      currency: p?.currency ?? "NGN",
      raw: { mock: true, outcome: outcome ?? null },
    };
  },
};
