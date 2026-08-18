/** DDR-044 — UTC clocks for Admin NNS / dfx cycles card. */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar clock UTC: dd/mm/yy hh:mm:ss */
export function formatDdMmYyHhMmSsUtc(isoOrMs: string | number | null | undefined): string {
  if (isoOrMs == null || isoOrMs === "unknown") return "—";
  const d = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(-2)} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

/** Remaining duration: DDDd HH:mm:ss */
export function formatRemainingClock(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "000d 00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${String(days).padStart(3, "0")}d ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function remainingMs(etaIso: string | null | undefined, nowMs: number): number {
  if (!etaIso) return Number.NaN;
  const t = Date.parse(etaIso);
  if (Number.isNaN(t)) return Number.NaN;
  return t - nowMs;
}

export type CyclesHealthV1 = {
  schema?: string;
  at?: string;
  atMs?: number;
  backendId?: string;
  frontendId?: string;
  etaFreezeAt?: string | null;
  etaZeroAt?: string | null;
  daysToFreeze?: number | null;
  band?: string;
  backend?: { status?: string; etaFreezeAt?: string | null; daysToFreeze?: number | null };
  frontend?: { status?: string; etaFreezeAt?: string | null; daysToFreeze?: number | null };
};

export function bandFromHealth(health: CyclesHealthV1 | null, nowMs: number): string {
  if (!health) return "unknown";
  if (health.backend?.status && health.backend.status !== "running") return "day";
  if (health.frontend?.status && health.frontend.status !== "running") return "day";
  const ms = remainingMs(health.etaFreezeAt, nowMs);
  if (!Number.isFinite(ms)) return health.band || "unknown";
  const days = ms / 86400000;
  if (days <= 1) return "day";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "healthy";
}
