import { describe, expect, it } from "vitest";
import { formatNaira } from "./brand";

describe("formatNaira", () => {
  it("formats whole naira without decimals", () => {
    const s = formatNaira(900_000);
    expect(s).toContain("₦");
    expect(s).toContain("9,000");
    expect(s).not.toContain(".00");
  });
  it("keeps kobo when present", () => {
    expect(formatNaira(950)).toContain("9.50");
  });
});
