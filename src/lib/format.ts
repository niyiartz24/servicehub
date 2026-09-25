export function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function daysUntil(d: Date | null | undefined, now = new Date()): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

export const cycleLabel: Record<string, string> = {
  MONTHLY: "month",
  QUARTERLY: "quarter",
  YEARLY: "year",
  ONE_TIME: "one-time",
  CUSTOM: "period",
};

export const methodLabel: Record<string, string> = {
  CARD: "Card",
  BANK_TRANSFER_PAYSTACK: "Bank transfer",
  BANK_TRANSFER_MANUAL: "Bank transfer (manual)",
};

export const formatPeriod = (a: Date | null, b: Date | null) =>
  a && b ? `${formatDate(a)} – ${formatDate(b)}` : "—";
