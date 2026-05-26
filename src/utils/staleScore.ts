export interface TabScore {
  label: string;
  color: string;
}

export function calcStaleScore(tabIndex: number, lastActiveTimestamp: number): number {
  const minutesDormant = (Date.now() - lastActiveTimestamp) / 60000;
  const timePenalty = Math.min(minutesDormant / 120, 1) * 60; // caps at 60pts after 2hrs
  const positionPenalty = Math.min(tabIndex / 30, 1) * 40;  // caps at 40pts
  return Math.round(timePenalty + positionPenalty);
}

export function staleLabel(score: number): TabScore {
  if (score <= 20) return { label: 'Active', color: '#22C55E' };
  if (score <= 45) return { label: 'Warm', color: '#EAB308' };
  if (score <= 70) return { label: 'Stale', color: '#F97316' };
  return { label: 'Dead Weight', color: '#EF4444' };
}
