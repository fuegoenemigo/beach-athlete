export function beachSetOpponent(day, set) {
  if (set.opponent?.trim()) return set.opponent.trim();
  if (day.sets?.length === 1 && day.opponent?.trim()) return day.opponent.trim();
  return null;
}
