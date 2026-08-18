/**
 * DDR-043 Phase 1 — remaining-time math + dfx status parsers.
 * Dfx store only. Never targets Caffeine nae7q-yaaaa-aaaai-atnvq-cai.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TARGETS = JSON.parse(
  readFileSync(join(HERE, "dfx-store-targets.json"), "utf8"),
);

export const BANDS = {
  none: 0,
  month: 1,
  week: 2,
  day: 3,
};

const FORBIDDEN_CMD = /\b(deploy|install|reinstall|uninstall|delete|stop|start)\b/i;

export function assertDfxStoreCanisterId(id, label) {
  const trimmed = String(id || "").trim();
  if (!trimmed) {
    throw new Error(`${label} canister id is empty`);
  }
  if (trimmed === TARGETS.caffeineBackendForbidden) {
    throw new Error(
      `${label} is Caffeine production ${TARGETS.caffeineBackendForbidden} — retired; dfx store only`,
    );
  }
  return trimmed;
}

export function assertPinnedDfxIds(backendId, frontendId) {
  const backend = assertDfxStoreCanisterId(backendId, "backend");
  const frontend = assertDfxStoreCanisterId(frontendId, "frontend");
  if (backend !== TARGETS.backendCanisterId) {
    throw new Error(
      `backend id ${backend} != pinned dfx ${TARGETS.backendCanisterId} (refusing: would not be the live store)`,
    );
  }
  if (frontend !== TARGETS.frontendCanisterId) {
    throw new Error(
      `frontend id ${frontend} != pinned dfx ${TARGETS.frontendCanisterId} (refusing: would not be the live store)`,
    );
  }
}

export function assertNoDestructiveDfxArgs(argv) {
  const joined = argv.slice(2).join(" ");
  if (FORBIDDEN_CMD.test(joined)) {
    throw new Error(
      `refusing argv that looks like a canister mutate: ${joined}`,
    );
  }
}

export function parseNat(text) {
  const digits = String(text ?? "")
    .replace(/_/g, "")
    .replace(/,/g, "")
    .match(/\d+/);
  if (!digits) return 0n;
  return BigInt(digits[0]);
}

/** Parse `dfx cycles balance` — "1.5 TC" or "1_500_000_000_000 cycles". */
export function parseCyclesBalanceOutput(text) {
  const raw = String(text ?? "").trim();
  const tc = raw.match(/([\d.]+)\s*TC/i);
  if (tc) {
    const n = Number(tc[1]);
    if (Number.isFinite(n)) return BigInt(Math.round(n * 1e12));
  }
  const trillion = raw.match(/([\d.]+)\s*trillion/i);
  if (trillion) {
    const n = Number(trillion[1]);
    if (Number.isFinite(n)) return BigInt(Math.round(n * 1e12));
  }
  return parseNat(raw);
}

export function parseCanisterStatusText(text) {
  const src = String(text ?? "");
  const field = (label) => {
    const re = new RegExp(`${label}:\\s*(.+)`, "i");
    const m = src.match(re);
    return m ? m[1].trim() : "";
  };
  const statusRaw = field("Status");
  const status = statusRaw.split(/\s/)[0].toLowerCase() || "unknown";
  return {
    status,
    cycles: parseNat(field("Balance") || field("Cycles")),
    reservedCycles: parseNat(field("Reserved Cycles") || field("Reserved")),
    memorySize: parseNat(field("Memory Size")),
    idleCyclesBurnedPerDay: parseNat(field("Idle cycles burned per day")),
    freezingThresholdSec: Number(
      parseNat(field("Freezing threshold") || String(TARGETS.defaultFreezeSec)),
    ),
    moduleHash: field("Module hash") || "",
    memoryAllocation: field("Memory allocation") || "",
    computeAllocation: field("Compute allocation") || "",
  };
}

export function cyclesToT(cycles) {
  return Number(cycles) / 1e12;
}

export function formatT(cycles, digits = 3) {
  return `${cyclesToT(cycles).toFixed(digits)} T`;
}

export function bytesToMiB(bytes) {
  return Number(bytes) / (1024 * 1024);
}

export function bytesToGiB(bytes) {
  return Number(bytes) / TARGETS.gibBytes;
}

export function memoryDailyBurn(memoryBytes) {
  const gib = bytesToGiB(memoryBytes);
  return gib * TARGETS.storageCyclesPerGibPerSec * TARGETS.secPerDay;
}

export function observedDailyBurn(prevCyclesSum, nowCyclesSum, elapsedDays) {
  if (!(elapsedDays > 0)) return 0;
  const prev = Number(prevCyclesSum);
  const now = Number(nowCyclesSum);
  if (!(now < prev)) return 0;
  return (prev - now) / elapsedDays;
}

export function pickDailyBurn({ dailyIdle, dailyFromMemory, dailyObserved }) {
  const idle = Number(dailyIdle) || 0;
  const mem = Number(dailyFromMemory) || 0;
  const obs = Number(dailyObserved) || 0;
  const dailyBurn = Math.max(idle, mem, obs);
  let winner = "idle";
  if (dailyBurn === 0) winner = "none";
  else if (dailyBurn === obs && obs >= mem && obs >= idle) winner = "observed";
  else if (dailyBurn === mem && mem >= idle) winner = "memory";
  return { dailyBurn, winner };
}

export function daysToZeroAndFreeze(cycles, dailyBurn, freezeSec) {
  const freezeDays = (Number(freezeSec) || TARGETS.defaultFreezeSec) / TARGETS.secPerDay;
  if (!(dailyBurn > 0)) {
    return {
      daysToZero: Number.POSITIVE_INFINITY,
      daysToFreeze: Number.POSITIVE_INFINITY,
      freezeDays,
    };
  }
  const daysToZero = Number(cycles) / dailyBurn;
  const daysToFreeze = Math.max(0, daysToZero - freezeDays);
  return { daysToZero, daysToFreeze, freezeDays };
}

export function bandFromDaysToFreeze(daysToFreeze) {
  if (!Number.isFinite(daysToFreeze)) return "none";
  if (daysToFreeze <= 1) return "day";
  if (daysToFreeze <= 7) return "week";
  if (daysToFreeze <= 30) return "month";
  return "none";
}

export function shouldNotifyBand(lastNotifiedBand, nextBand) {
  const last = BANDS[lastNotifiedBand] ?? 0;
  const next = BANDS[nextBand] ?? 0;
  if (next === 0) return { notify: false, lastNotifiedBand: "none" };
  if (next > last) return { notify: true, lastNotifiedBand: nextBand };
  return { notify: false, lastNotifiedBand: lastNotifiedBand || "none" };
}

export function addDaysIso(fromMs, days) {
  if (!Number.isFinite(days)) return "unknown";
  const ms = fromMs + days * TARGETS.secPerDay * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function evaluateStoreSnapshot({
  backend,
  frontend,
  prev,
  nowMs = Date.now(),
}) {
  const backendMem = Number(backend.memorySize ?? 0);
  const frontendMem = Number(frontend.memorySize ?? 0);
  const memBytes = backendMem + frontendMem;
  const dailyFromMemory = memoryDailyBurn(memBytes);
  const dailyIdle =
    Number(backend.idleCyclesBurnedPerDay ?? 0) +
    Number(frontend.idleCyclesBurnedPerDay ?? 0);
  const nowCycles =
    BigInt(backend.cycles ?? 0) + BigInt(frontend.cycles ?? 0);
  let dailyObserved = 0;
  if (prev?.atMs && prev?.cyclesSum != null) {
    const elapsedDays = (nowMs - Number(prev.atMs)) / (TARGETS.secPerDay * 1000);
    dailyObserved = observedDailyBurn(prev.cyclesSum, nowCycles, elapsedDays);
  }
  const { dailyBurn, winner } = pickDailyBurn({
    dailyIdle,
    dailyFromMemory,
    dailyObserved,
  });

  const combined = daysToZeroAndFreeze(
    nowCycles,
    dailyBurn,
    Math.max(
      Number(backend.freezingThresholdSec || TARGETS.defaultFreezeSec),
      Number(frontend.freezingThresholdSec || TARGETS.defaultFreezeSec),
    ),
  );
  const backendEta = daysToZeroAndFreeze(
    backend.cycles ?? 0,
    Math.max(
      Number(backend.idleCyclesBurnedPerDay ?? 0),
      memoryDailyBurn(backendMem),
    ),
    backend.freezingThresholdSec || TARGETS.defaultFreezeSec,
  );
  const frontendEta = daysToZeroAndFreeze(
    frontend.cycles ?? 0,
    Math.max(
      Number(frontend.idleCyclesBurnedPerDay ?? 0),
      memoryDailyBurn(frontendMem),
    ),
    frontend.freezingThresholdSec || TARGETS.defaultFreezeSec,
  );

  const daysToFreeze = Math.min(
    combined.daysToFreeze,
    backendEta.daysToFreeze,
    frontendEta.daysToFreeze,
  );
  const daysToZero = Math.min(
    combined.daysToZero,
    backendEta.daysToZero,
    frontendEta.daysToZero,
  );

  const band = bandFromDaysToFreeze(daysToFreeze);
  const backendStopped = String(backend.status || "").toLowerCase() !== "running";
  const frontendStopped =
    String(frontend.status || "").toLowerCase() !== "running";

  return {
    memBytes,
    dailyFromMemory,
    dailyIdle,
    dailyObserved,
    dailyBurn,
    winner,
    daysToFreeze,
    daysToZero,
    freezeDays: combined.freezeDays,
    band,
    etaFreeze: addDaysIso(nowMs, daysToFreeze),
    etaZero: addDaysIso(nowMs, daysToZero),
    cyclesSum: nowCycles,
    backendStopped,
    frontendStopped,
    backendEta,
    frontendEta,
  };
}

export function bandLabel(band) {
  if (band === "month") return "1 month";
  if (band === "week") return "1 week";
  if (band === "day") return "1 day";
  return "none";
}
