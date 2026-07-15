export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}
