#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  TARGETS,
  assertDfxStoreCanisterId,
  assertNoDestructiveDfxArgs,
  assertPinnedDfxIds,
  bandFromDaysToFreeze,
  evaluateStoreSnapshot,
  memoryDailyBurn,
  parseCanisterStatusText,
  parseCyclesBalanceOutput,
  shouldNotifyBand,
} from "./lib/store-cycles.mjs";

assert.equal(TARGETS.backendCanisterId, "5z2v5-uqaaa-aaaao-bbeaq-cai");
assert.equal(TARGETS.frontendCanisterId, "5xyyv-paaaa-aaaao-bbebq-cai");

assert.throws(() => assertDfxStoreCanisterId(TARGETS.caffeineBackendForbidden, "backend"));
assert.doesNotThrow(() =>
  assertPinnedDfxIds(TARGETS.backendCanisterId, TARGETS.frontendCanisterId),
);
assert.throws(() =>
  assertPinnedDfxIds("aaaaa-aa", TARGETS.frontendCanisterId),
);
assert.throws(() => assertNoDestructiveDfxArgs(["node", "x", "deploy"]));
assert.doesNotThrow(() => assertNoDestructiveDfxArgs(["node", "x", "--no-alerts"]));

const sample = `
Canister status call result for 5z2v5-uqaaa-aaaao-bbeaq-cai.
Status: Running
Controllers: abc
Memory allocation: 0 Bytes
Compute allocation: 0%
Freezing threshold: 2_592_000 Seconds
Idle cycles burned per day: 3_000_000_000 Cycles
Memory Size: 262_144_000 Bytes
Balance: 5_000_000_000_000 Cycles
Reserved Cycles: 0 Cycles
Module hash: 0xabc
`;
const parsed = parseCanisterStatusText(sample);
assert.equal(parsed.status, "running");
assert.equal(parsed.cycles, 5_000_000_000_000n);
assert.equal(parsed.memorySize, 262_144_000n);
assert.equal(parsed.freezingThresholdSec, 2_592_000);

assert.equal(parseCyclesBalanceOutput("1.5 TC (trillion cycles)."), 1_500_000_000_000n);
assert.equal(parseCyclesBalanceOutput("2_000_000_000_000 cycles."), 2_000_000_000_000n);

const memDay = memoryDailyBurn(262_144_000);
assert.ok(memDay > 2e9 && memDay < 4e9, `memory daily ${memDay}`);

assert.equal(bandFromDaysToFreeze(40), "none");
assert.equal(bandFromDaysToFreeze(20), "month");
assert.equal(bandFromDaysToFreeze(5), "week");
assert.equal(bandFromDaysToFreeze(0.5), "day");

const cross = shouldNotifyBand("none", "month");
assert.equal(cross.notify, true);
assert.equal(cross.lastNotifiedBand, "month");
assert.equal(shouldNotifyBand("month", "month").notify, false);
assert.equal(shouldNotifyBand("week", "none").lastNotifiedBand, "none");
assert.equal(shouldNotifyBand("month", "day").notify, true);

const nowMs = Date.parse("2026-08-18T15:00:00Z");
const snap = evaluateStoreSnapshot({
  backend: {
    status: "running",
    cycles: 8_000_000_000_000n,
    memorySize: 262_144_000n,
    idleCyclesBurnedPerDay: 2_000_000_000n,
    freezingThresholdSec: 2_592_000,
  },
  frontend: {
    status: "running",
    cycles: 2_000_000_000_000n,
    memorySize: 20_000_000n,
    idleCyclesBurnedPerDay: 500_000_000n,
    freezingThresholdSec: 2_592_000,
  },
  prev: {
    atMs: nowMs - 2 * 86400 * 1000,
    cyclesSum: 12_000_000_000_000n,
  },
  nowMs,
});
assert.ok(snap.dailyBurn > 0);
assert.ok(["idle", "memory", "observed"].includes(snap.winner));
assert.equal(typeof snap.etaFreeze, "string");
assert.equal(snap.backendStopped, false);

const topupIgnored = evaluateStoreSnapshot({
  backend: {
    status: "running",
    cycles: 20_000_000_000_000n,
    memorySize: 1000n,
    idleCyclesBurnedPerDay: 1_000_000n,
    freezingThresholdSec: 2_592_000,
  },
  frontend: {
    status: "running",
    cycles: 5_000_000_000_000n,
    memorySize: 1000n,
    idleCyclesBurnedPerDay: 1_000_000n,
    freezingThresholdSec: 2_592_000,
  },
  prev: { atMs: nowMs - 86400 * 1000, cyclesSum: 1_000_000_000_000n },
  nowMs,
});
assert.equal(topupIgnored.dailyObserved, 0);

console.log("store-cycles-sentinel tests ok");
