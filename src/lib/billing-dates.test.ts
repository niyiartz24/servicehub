import { describe, expect, it } from "vitest";
import { addCycle } from "./billing-dates";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date | null) => x?.toISOString().slice(0, 10) ?? null;

describe("addCycle", () => {
  it("adds a month, clamping to the end of shorter months", () => {
    expect(iso(addCycle(d("2026-10-19"), "MONTHLY"))).toBe("2026-11-19");
    expect(iso(addCycle(d("2027-01-31"), "MONTHLY"))).toBe("2027-02-28");
    expect(iso(addCycle(d("2028-01-31"), "MONTHLY"))).toBe("2028-02-29"); // leap year
  });
  it("handles quarterly and yearly, including Feb 29", () => {
    expect(iso(addCycle(d("2026-11-30"), "QUARTERLY"))).toBe("2027-02-28");
    expect(iso(addCycle(d("2028-02-29"), "YEARLY"))).toBe("2029-02-28");
  });
  it("returns null for one-time and for custom without days", () => {
    expect(addCycle(d("2026-10-19"), "ONE_TIME")).toBeNull();
    expect(addCycle(d("2026-10-19"), "CUSTOM")).toBeNull();
  });
  it("adds custom days", () => {
    expect(iso(addCycle(d("2026-10-19"), "CUSTOM", 10))).toBe("2026-10-29");
  });
});
