import "server-only";
import { mockGateway } from "./mock";
import { paystackGateway } from "./paystack";
import type { PaymentGateway } from "./types";

export function getGateway(): PaymentGateway {
  if (process.env.PAYSTACK_SECRET_KEY) return paystackGateway;
  if (process.env.NODE_ENV === "production") throw new Error("PAYSTACK_SECRET_KEY must be set in production.");
  return mockGateway;
}

/** Settlement uses the gateway a payment was created with, not whatever is configured now. */
export function getGatewayByName(name: string | null): PaymentGateway {
  if (name === "mock") {
    if (process.env.NODE_ENV === "production") throw new Error("Mock payments cannot be settled in production.");
    return mockGateway;
  }
  return paystackGateway;
}

export type { PaymentGateway } from "./types";
