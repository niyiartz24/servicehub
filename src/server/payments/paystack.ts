import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { GatewayError, type PaymentGateway, type VerifyStatus } from "./types";

const BASE = "https://api.paystack.co";

function secretKey(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new GatewayError("PAYSTACK_SECRET_KEY is not set");
  return k;
}

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !json?.status) throw new GatewayError(json?.message ?? `Paystack responded ${res.status}`);
  return json.data;
}

const mapStatus = (s: string): VerifyStatus =>
  s === "success" ? "success" : ["failed", "abandoned", "reversed"].includes(s) ? "failed" : "pending";

export const paystackGateway: PaymentGateway = {
  name: "paystack",

  async initialize({ reference, email, amountKobo, callbackUrl, channels, metadata }) {
    const data = await call<{ authorization_url: string; access_code: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({ email, amount: amountKobo, currency: "NGN", reference, callback_url: callbackUrl, channels, metadata }),
    });
    return { authorizationUrl: data.authorization_url, gatewayRef: data.access_code };
  },

  async verify(reference) {
    const d = await call<{
      id: number; status: string; reference: string; amount: number; currency: string;
      channel?: string; paid_at?: string | null; gateway_response?: string;
    }>(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (d.reference !== reference) throw new GatewayError("Reference mismatch in verify response");
    return {
      status: mapStatus(d.status),
      amountKobo: d.amount,
      currency: d.currency,
      raw: { id: d.id, status: d.status, reference: d.reference, amount: d.amount, currency: d.currency, channel: d.channel ?? null, paid_at: d.paid_at ?? null, gateway_response: d.gateway_response ?? null },
    };
  },
};

/** Paystack signs the raw body with HMAC-SHA512 using your secret key.
 *  PAYSTACK_WEBHOOK_SECRET is an optional override if you ever front Paystack with a proxy that re-signs. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const key = process.env.PAYSTACK_WEBHOOK_SECRET || secretKey();
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
