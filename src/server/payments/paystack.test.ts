import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./paystack";

const body = JSON.stringify({ event: "charge.success", data: { reference: "SLX-PAY-00001" } });
const sign = (payload: string, key: string) => createHmac("sha512", key).update(payload).digest("hex");

describe("verifyWebhookSignature", () => {
  beforeAll(() => { process.env.PAYSTACK_SECRET_KEY = "sk_test_unit"; delete process.env.PAYSTACK_WEBHOOK_SECRET; });

  it("accepts a correctly signed body", () => {
    expect(verifyWebhookSignature(body, sign(body, "sk_test_unit"))).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(body.replace("00001", "00002"), sign(body, "sk_test_unit"))).toBe(false);
  });
  it("rejects a signature made with a different key", () => {
    expect(verifyWebhookSignature(body, sign(body, "someone_elses_key"))).toBe(false);
  });
  it("rejects garbage of the wrong length without throwing", () => {
    expect(verifyWebhookSignature(body, "abc")).toBe(false);
  });
});
