import type { Prisma } from "@prisma/client";

export type VerifyStatus = "success" | "failed" | "pending";

export interface InitializeInput {
  reference: string;
  email: string;
  amountKobo: number;
  callbackUrl: string;
  channels?: ("card" | "bank_transfer")[];
  metadata?: Record<string, string>;
}
export interface InitializeResult { authorizationUrl: string; gatewayRef: string }
export interface VerifyResult {
  status: VerifyStatus;
  amountKobo: number;
  currency: string;
  /** Reduced, non-sensitive subset kept for audit. Never full card details. */
  raw: Prisma.InputJsonObject | null;
}

export interface PaymentGateway {
  readonly name: "paystack" | "mock";
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /** Must ask the gateway itself. Never trust client-supplied or webhook-supplied status. */
  verify(reference: string): Promise<VerifyResult>;
}

export class GatewayError extends Error {}
