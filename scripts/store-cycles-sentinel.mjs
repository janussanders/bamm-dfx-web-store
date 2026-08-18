#!/usr/bin/env node
/**
 * DDR-043 Phase 1 — dfx store cycles sentinel (status + email only).
 *
 * FORBIDDEN: dfx deploy, install, reinstall, canister create, cycles top-up.
 * FORBIDDEN: Caffeine canister nae7q-yaaaa-aaaai-atnvq-cai (retired).
 * Artifacts (.dmg/.exe), admins, Stripe/RESEND stay on the live dfx canisters.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TARGETS,
  assertDfxStoreCanisterId,
  assertNoDestructiveDfxArgs,
  assertPinnedDfxIds,
  bandLabel,
  evaluateStoreSnapshot,
  buildPublicCyclesHealth,
  formatT,
  parseCanisterStatusText,
  parseCyclesBalanceOutput,
  shouldNotifyBand,
  bytesToMiB,
} from "./lib/store-cycles.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_PATH =
  process.env.CYCLE_SENTINEL_STATE ||
  join(ROOT, ".cache", "store-cycles-sentinel.json");
const HEALTH_PATH =
  process.env.CYCLE_HEALTH_PATH ||
  join(ROOT, ".cache", "cycles-health.json");
const SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY;

assertNoDestructiveDfxArgs(process.argv);

function loadPinnedIds() {
  const raw = JSON.parse(
    readFileSync(join(ROOT, "canister_ids.json"), "utf8"),
  );
  const backend = raw.backend?.ic;
  const frontend = raw.frontend?.ic;
  assertPinnedDfxIds(backend, frontend);
  return { backend, frontend };
}

function dfx(args, { allowFail = false } = {}) {
  const forbidden = args.some((a) =>
    /^(deploy|install|reinstall|create|uninstall|delete|stop|start|top-up|topup)$/i.test(
      a,
    ),
  );
  if (forbidden) {
    throw new Error(`refusing dfx ${args.join(" ")} — sentinel is status-only`);
  }
  try {
    return execFileSync("dfx", args, {
      encoding: "utf8",
      env: {
        ...process.env,
        DFX_WARNING: "-mainnet_plaintext_identity",
        DFX_TELEMETRY_DISABLED: "1",
      },
    });
  } catch (err) {
    if (allowFail) {
      return err.stdout ? String(err.stdout) : String(err.message || err);
    }
    throw err;
  }
}

function serializeStatus(s) {
  return {
    status: s.status,
    cycles: s.cycles.toString(),
    reservedCycles: s.reservedCycles.toString(),
    memorySize: s.memorySize.toString(),
    idleCyclesBurnedPerDay: s.idleCyclesBurnedPerDay.toString(),
    freezingThresholdSec: s.freezingThresholdSec,
    moduleHash: s.moduleHash,
  };
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { lastNotifiedBand: "none" };
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { lastNotifiedBand: "none" };
  }
}

function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function parseEmails(raw) {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildEmail({ evalResult, backend, frontend, backendId, frontendId, ciLedger, band, kind }) {
  const title =
    kind === "ci_ledger"
      ? "[BAMM store] GitHub CI cycles ledger is below 0.5 T"
      : `[BAMM store] ${bandLabel(band)} of cycles left — freeze ~ ${evalResult.etaFreeze}`;
  const lines = [
    kind === "ci_ledger"
      ? "The GitHub CI identity does not have enough cycles to top up the dfx store. Canisters may still be running."
      : `The dfx BAMM store is estimated to <strong>freeze in ${bandLabel(band)}</strong> (not Caffeine; Caffeine is retired).`,
    `<p><strong>Estimated freeze date:</strong> ${htmlEscape(evalResult.etaFreeze)} UTC<br/>`,
    `<strong>Estimated zero date:</strong> ${htmlEscape(evalResult.etaZero)} UTC</p>`,
    `<p>Store: <a href="${TARGETS.storeUrl}">${TARGETS.storeUrl}</a><br/>`,
    `NNS (send ICP): <a href="${TARGETS.nnsAccountsUrl}">${TARGETS.nnsAccountsUrl}</a></p>`,
    `<p><strong>Backend</strong> (installers) <code>${backendId}</code><br/>`,
    `status ${htmlEscape(backend.status)} · ${formatT(backend.cycles)} · ${bytesToMiB(backend.memorySize).toFixed(1)} MiB · idle ${formatT(backend.idleCyclesBurnedPerDay)}/day</p>`,
    `<p><strong>Frontend</strong> <code>${frontendId}</code><br/>`,
    `status ${htmlEscape(frontend.status)} · ${formatT(frontend.cycles)} · ${bytesToMiB(frontend.memorySize).toFixed(1)} MiB · idle ${formatT(frontend.idleCyclesBurnedPerDay)}/day</p>`,
    `<p>Combined memory ${bytesToMiB(evalResult.memBytes).toFixed(1)} MiB · daily burn ${formatT(evalResult.dailyBurn)} (${htmlEscape(evalResult.winner)}) · days to freeze ${Number.isFinite(evalResult.daysToFreeze) ? evalResult.daysToFreeze.toFixed(1) : "unknown"}</p>`,
    `<p>CI cycles ledger: ${formatT(ciLedger)} (floor 0.5 T)<br/>`,
    `Send ICP to account ID:<br/><code>${TARGETS.ciIcpAccountId}</code></p>`,
    `<ol><li>Open ${TARGETS.nnsAccountsUrl} and send ICP to the CI account ID above.</li>`,
    `<li><code>dfx identity use bamm-dfx-ci && dfx cycles convert --amount &lt;ICP&gt; --network ic</code></li>`,
    `<li><code>dfx cycles top-up backend &lt;cycles&gt; --network ic</code> and the same for frontend. Do not reinstall. Do not touch Caffeine.</li>`,
    `<li>Confirm ${TARGETS.storeUrl}</li></ol>`,
    `<p>Topping up cycles does not fix IC0503. This alert never deploys or wipes .dmg/.exe artifacts.</p>`,
  ];
  return { subject: title, html: lines.join("\n") };
}

async function sendResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  const from =
    process.env.RESEND_FROM ||
    "BAMM_Email <jay.hughes@contact.bammservice.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`RESEND ${res.status}: ${body}`);
  }
  return body;
}

function appendSummary(md) {
  if (!SUMMARY_PATH) {
    console.log(md);
    return;
  }
  writeFileSync(SUMMARY_PATH, md, { flag: "a" });
}

async function main() {
  const sendAlerts =
    process.env.CYCLE_SENTINEL_SEND_ALERTS !== "0" &&
    process.argv.includes("--no-alerts") === false;
  const { backend: backendId, frontend: frontendId } = loadPinnedIds();
  assertDfxStoreCanisterId(backendId, "backend");
  assertDfxStoreCanisterId(frontendId, "frontend");

  const network = process.env.DFX_NETWORK || "ic";
  const identity = process.env.DFX_IDENTITY || "ci";

  const backendText = dfx([
    "canister",
    "status",
    "backend",
    "--network",
    network,
    "--identity",
    identity,
  ]);
  const frontendText = dfx([
    "canister",
    "status",
    "frontend",
    "--network",
    network,
    "--identity",
    identity,
  ]);
  const ledgerText = dfx(
    ["cycles", "balance", "--network", network, "--identity", identity],
    { allowFail: true },
  );

  const backend = parseCanisterStatusText(backendText);
  const frontend = parseCanisterStatusText(frontendText);
  const ciLedger = parseCyclesBalanceOutput(ledgerText);

  const prev = loadState();
  const nowMs = Date.now();
  const evalResult = evaluateStoreSnapshot({
    backend,
    frontend,
    prev: {
      atMs: prev.atMs,
      cyclesSum: prev.cyclesSum != null ? BigInt(prev.cyclesSum) : null,
    },
    nowMs,
  });

  const effectiveBand =
    evalResult.backendStopped || evalResult.frontendStopped
      ? "day"
      : evalResult.band;
  const bandDecision = shouldNotifyBand(
    prev.lastNotifiedBand || "none",
    effectiveBand,
  );
  const ciLow = ciLedger < BigInt(TARGETS.ciLedgerFloorCycles);
  const ciRecovered = !ciLow;
  const shouldCiMail = ciLow && !prev.ciLedgerAlertOpen;

  const snapshot = {
    at: new Date(nowMs).toISOString(),
    atMs: nowMs,
    backendId,
    frontendId,
    backend: serializeStatus(backend),
    frontend: serializeStatus(frontend),
    ciLedger: ciLedger.toString(),
    cyclesSum: evalResult.cyclesSum.toString(),
    dailyBurn: evalResult.dailyBurn,
    winner: evalResult.winner,
    daysToFreeze: evalResult.daysToFreeze,
    daysToZero: evalResult.daysToZero,
    band: effectiveBand,
    etaFreeze: evalResult.etaFreeze,
    etaZero: evalResult.etaZero,
    etaFreezeAt: evalResult.etaFreezeAt,
    etaZeroAt: evalResult.etaZeroAt,
    lastNotifiedBand: bandDecision.lastNotifiedBand,
    ciLedgerAlertOpen: ciLow,
    backendStopped: evalResult.backendStopped,
    frontendStopped: evalResult.frontendStopped,
  };

  const emails = parseEmails(process.env.CYCLE_ALERT_FALLBACK_EMAILS);
  const mails = [];
  if (sendAlerts && bandDecision.notify) {
    mails.push({
      kind: "band",
      band: effectiveBand,
      ...buildEmail({
        evalResult,
        backend,
        frontend,
        backendId,
        frontendId,
        ciLedger,
        band: effectiveBand,
        kind: "band",
      }),
    });
  }
  if (sendAlerts && shouldCiMail) {
    mails.push({
      kind: "ci_ledger",
      band: "none",
      ...buildEmail({
        evalResult,
        backend,
        frontend,
        backendId,
        frontendId,
        ciLedger,
        band: "none",
        kind: "ci_ledger",
      }),
    });
  }
  if (ciRecovered) snapshot.ciLedgerAlertOpen = false;

  const sendErrors = [];
  if (mails.length > 0 && emails.length === 0) {
    sendErrors.push(
      "CYCLE_ALERT_FALLBACK_EMAILS is empty — Phase 1 cannot mail Super Admins from Motoko; set the secret",
    );
  }
  for (const mail of mails) {
    for (const to of emails) {
      try {
        await sendResend({ to, subject: mail.subject, html: mail.html });
        console.log(`sent ${mail.kind} to ${to}`);
      } catch (err) {
        sendErrors.push(`${to}: ${err.message}`);
      }
    }
  }

  saveState(snapshot);

  const health = buildPublicCyclesHealth({
    backendId,
    frontendId,
    backend,
    frontend,
    evalResult,
    nowMs,
    band: effectiveBand,
  });
  mkdirSync(dirname(HEALTH_PATH), { recursive: true });
  writeFileSync(HEALTH_PATH, `${JSON.stringify(health, null, 2)}\n`);
  mkdirSync(join(ROOT, "ops"), { recursive: true });
  writeFileSync(
    join(ROOT, "ops", "cycles-health.json"),
    `${JSON.stringify(health, null, 2)}\n`,
  );

  const md = [
    "## Dfx store cycles sentinel (DDR-043 Phase 1)",
    "",
    "- **Scope:** dfx canisters only. Caffeine `nae7q-…` is retired and was not contacted.",
    "- **Mutations:** none (no deploy / install / reinstall / create / top-up). Store .dmg/.exe untouched.",
    `- **Backend:** \`${backendId}\` · ${backend.status} · ${formatT(backend.cycles)} · ${bytesToMiB(backend.memorySize).toFixed(1)} MiB`,
    `- **Frontend:** \`${frontendId}\` · ${frontend.status} · ${formatT(frontend.cycles)} · ${bytesToMiB(frontend.memorySize).toFixed(1)} MiB`,
    `- **CI ledger:** ${formatT(ciLedger)}`,
    `- **Daily burn:** ${formatT(evalResult.dailyBurn)} (${evalResult.winner})`,
    `- **Days to freeze:** ${Number.isFinite(evalResult.daysToFreeze) ? evalResult.daysToFreeze.toFixed(1) : "unknown"} → **${evalResult.band}**`,
    `- **ETA freeze:** ${evalResult.etaFreezeAt || evalResult.etaFreeze} · **ETA zero:** ${evalResult.etaZeroAt || evalResult.etaZero}`,
    `- **Alerts sent:** ${mails.length} (${emails.length} recipient(s))`,
    `- **NNS:** ${TARGETS.nnsAccountsUrl}`,
    `- **Store:** ${TARGETS.storeUrl}`,
    "",
  ].join("\n");
  appendSummary(md);

  console.log(JSON.stringify({ ...snapshot, sendErrors }, null, 2));
  if (sendErrors.length > 0 && mails.length > 0) {
    console.error(sendErrors.join("\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
