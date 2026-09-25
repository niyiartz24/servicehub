import { describe, expect, it } from "vitest";
import { reminderStage } from "./reminder-stage";

describe("reminderStage", () => {
  it.each([
    [15, null], [14, "T-14"], [8, "T-14"], [7, "T-7"], [4, "T-7"],
    [3, "T-3"], [1, "T-3"], [0, "T-0"], [-1, "T+1"], [-30, "T+1"], [-31, null],
  ])("%i days until due -> %s", (days, expected) => {
    expect(reminderStage(days)).toBe(expected);
  });
});
