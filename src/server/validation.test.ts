import { describe, expect, it } from "vitest";
import { assignSchema, domainRequestSchema, planSchema } from "./validation";

// Requires `npx prisma generate` (enums come from @prisma/client).
describe("validation", () => {
  it("converts naira input to integer kobo", () => {
    const r = planSchema.parse({ serviceTypeId: "t", name: "Standard", defaultPrice: "9000", billingCycle: "MONTHLY" });
    expect(r.defaultPrice).toBe(900_000);
  });
  it("rounds fractional naira to whole kobo", () => {
    const r = planSchema.parse({ serviceTypeId: "t", name: "X", defaultPrice: "7500.505", billingCycle: "MONTHLY" });
    expect(Number.isInteger(r.defaultPrice)).toBe(true);
  });
  it("rejects negative prices", () => {
    expect(planSchema.safeParse({ serviceTypeId: "t", name: "X", defaultPrice: "-1", billingCycle: "MONTHLY" }).success).toBe(false);
  });
  it("treats a blank custom price as 'use the plan default'", () => {
    const r = assignSchema.parse({ projectId: "p", planId: "l", serviceName: "db", price: "", startDate: "2026-10-19" });
    expect(r.price).toBeUndefined();
  });
  it("normalises and validates domains", () => {
    expect(domainRequestSchema.parse({ domain: " Example.COM ", durationYears: "1" }).domain).toBe("example.com");
    expect(domainRequestSchema.safeParse({ domain: "not_a_domain", durationYears: "1" }).success).toBe(false);
    expect(domainRequestSchema.safeParse({ domain: "https://example.com", durationYears: "1" }).success).toBe(false);
  });
});
