/**
 * Which single reminder applies today. Windows (not exact days) so a missed cron run
 * still sends the current stage once instead of silently skipping it.
 */
export function reminderStage(daysUntilDue: number): string | null {
  if (daysUntilDue > 7 && daysUntilDue <= 14) return "T-14";
  if (daysUntilDue > 3 && daysUntilDue <= 7) return "T-7";
  if (daysUntilDue > 0 && daysUntilDue <= 3) return "T-3";
  if (daysUntilDue === 0) return "T-0";
  if (daysUntilDue < 0 && daysUntilDue >= -30) return "T+1"; // "after expiration"; older lapses are not re-announced
  return null;
}
