import type { BillingCycle } from "@prisma/client";

function addMonthsUTC(d: Date, n: number): Date {
  const day = d.getUTCDate();
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, d.getUTCHours(), d.getUTCMinutes()));
  const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, lastDay)); // Jan 31 + 1 month = Feb 28/29, not Mar 3
  return r;
}

/** Next billing date after `from`. Null for ONE_TIME, or CUSTOM without a day count. */
export function addCycle(from: Date, cycle: BillingCycle, customDays?: number | null): Date | null {
  switch (cycle) {
    case "MONTHLY": return addMonthsUTC(from, 1);
    case "QUARTERLY": return addMonthsUTC(from, 3);
    case "YEARLY": return addMonthsUTC(from, 12);
    case "CUSTOM": return customDays ? new Date(from.getTime() + customDays * 86_400_000) : null;
    case "ONE_TIME": return null;
  }
}

const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/**
 * Business rule (confirm with SynthaxLab): a renewal starts at the current next-billing date.
 * If the service has already lapsed, the new period starts today, with no back-charge for the gap.
 */
export function computeRenewalPeriod(
  sub: { nextBillingDate: Date | null; billingCycle: BillingCycle; customCycleDays: number | null },
  now = new Date(),
) {
  const start = sub.nextBillingDate && sub.nextBillingDate >= now ? sub.nextBillingDate : startOfDayUTC(now);
  return { start, end: addCycle(start, sub.billingCycle, sub.customCycleDays) };
}
