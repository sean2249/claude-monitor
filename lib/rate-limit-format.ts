export function formatResetTime(
  oldestTokenTs: string | null,
  windowMs: number,
  now: Date = new Date(),
): string {
  if (!oldestTokenTs) return '—';
  const oldest = new Date(oldestTokenTs).getTime();
  const resetAt = oldest + windowMs;
  const remainingMs = resetAt - now.getTime();
  if (remainingMs <= 0) return 'now';

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hoursAfterDays = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hoursAfterDays}h`;
  if (hoursAfterDays > 0) return `${hoursAfterDays}h ${minutes}m`;
  return `${minutes}m`;
}
