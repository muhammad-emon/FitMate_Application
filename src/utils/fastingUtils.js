// Fasting protocols: { fast hours, eating window hours }
export const FASTING_PROTOCOLS = {
  '16:8': { fast: 16, eat: 8, label: '16:8 — Most Popular' },
  '18:6': { fast: 18, eat: 6, label: '18:6 — Intermediate' },
  '20:4': { fast: 20, eat: 4, label: '20:4 — Advanced' },
  OMAD:   { fast: 23, eat: 1, label: 'OMAD — One Meal a Day' },
};

export function getFastDurationMs(protocol) {
  return 30 * 1000; // 🧪 DEMO BUILD — 30 seconds for all protocols
}

export function getEatingWindowMs(protocol) {
  return (FASTING_PROTOCOLS[protocol]?.eat || 8) * 60 * 60 * 1000;
}

// Format ms remaining as HH:MM:SS
export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// Progress 0–1 for the ring
export function getFastProgress(startTime, protocol) {
  const elapsed = Date.now() - startTime;
  const total = getFastDurationMs(protocol);
  return Math.min(elapsed / total, 1);
}
