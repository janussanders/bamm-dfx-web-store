import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type CyclesHealthV1,
  bandFromHealth,
  formatDdMmYyHhMmSsUtc,
  formatRemainingClock,
  remainingMs,
} from "@/lib/cyclesClocks";
import {
  DFX_STORE_TARGETS,
  cyclesHealthUrls,
  icDashboardUrl,
  sentinelWorkflowUrl,
} from "@/lib/dfxStoreTargets";
import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type PublicCanisterInfo = {
  canister_id?: string;
  module_hash?: string | null;
  subnet_id?: string | null;
  updated_at?: string | null;
};

function useNowMs(intervalMs = 1000) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return nowMs;
}

function useCyclesHealth() {
  const [health, setHealth] = useState<CyclesHealthV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const urls = cyclesHealthUrls();
    (async () => {
      for (const base of urls) {
        try {
          const res = await fetch(`${base}?t=${Date.now()}`);
          if (!res.ok) continue;
          const json = (await res.json()) as CyclesHealthV1;
          if (json.backendId !== DFX_STORE_TARGETS.backendCanisterId) continue;
          if (json.frontendId !== DFX_STORE_TARGETS.frontendCanisterId) continue;
          if (json.backendId === DFX_STORE_TARGETS.caffeineBackendForbidden) {
            continue;
          }
          if (!cancelled) {
            setHealth(json);
            setError(null);
          }
          return;
        } catch {
          /* try next mirror */
        }
      }
      if (!cancelled) {
        setError("No sentinel snapshot yet — run Store cycles sentinel");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { health, error };
}

function usePublicCanister(id: string) {
  const [data, setData] = useState<PublicCanisterInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    const url = `https://ic-api.internetcomputer.org/api/v3/canisters/${id}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`IC API ${res.status}`);
        return (await res.json()) as PublicCanisterInfo;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        /* dashboard link remains */
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return data;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-xs break-all bg-muted px-2 py-1 rounded flex-1">
          {value}
        </code>
        <Button type="button" size="icon" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function bandBadgeClass(band: string): string {
  if (band === "day") return "bg-red-600 text-white";
  if (band === "week") return "bg-orange-500 text-white";
  if (band === "month") return "bg-amber-500 text-black";
  if (band === "healthy") return "bg-emerald-600 text-white";
  return "";
}

function RemainingClocks({
  etaFreezeAt,
  etaZeroAt,
  nowMs,
}: {
  etaFreezeAt?: string | null;
  etaZeroAt?: string | null;
  nowMs: number;
}) {
  const rem = remainingMs(etaFreezeAt, nowMs);
  const frozen = Number.isFinite(rem) && rem <= 0;
  return (
    <div className="grid gap-2 font-mono text-sm">
      <div>
        <div className="text-xs text-muted-foreground">Freeze at (UTC)</div>
        <div className="text-base font-semibold tracking-wide">
          {formatDdMmYyHhMmSsUtc(etaFreezeAt)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Remaining</div>
        <div
          className={`text-lg font-semibold tracking-wide ${frozen ? "text-red-600" : ""}`}
        >
          {Number.isFinite(rem) ? formatRemainingClock(rem) : "—"}
        </div>
      </div>
      {etaZeroAt && (
        <div>
          <div className="text-xs text-muted-foreground">Zero at (UTC)</div>
          <div className="text-xs tracking-wide">
            {formatDdMmYyHhMmSsUtc(etaZeroAt)}
          </div>
        </div>
      )}
    </div>
  );
}

function CanisterStatusRow({
  label,
  id,
  etaFreezeAt,
  nowMs,
}: {
  label: string;
  id: string;
  etaFreezeAt?: string | null;
  nowMs: number;
}) {
  const data = usePublicCanister(id);
  const rem = remainingMs(etaFreezeAt, nowMs);
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="outline">{id.slice(0, 5)}…</Badge>
      </div>
      <p className="text-xs text-muted-foreground font-mono break-all">{id}</p>
      <RemainingClocks etaFreezeAt={etaFreezeAt} nowMs={nowMs} />
      {data?.updated_at && (
        <p className="text-xs text-muted-foreground">
          IC index {formatDdMmYyHhMmSsUtc(data.updated_at)} UTC
        </p>
      )}
      {!Number.isFinite(rem) && (
        <p className="text-xs text-muted-foreground">
          Remaining clocks fill after the next sentinel snapshot.
        </p>
      )}
      <Button variant="outline" size="sm" asChild>
        <a href={icDashboardUrl(id)} target="_blank" rel="noreferrer">
          IC dashboard status
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    </div>
  );
}

export default function NnsCyclesStatusCard() {
  const t = DFX_STORE_TARGETS;
  const nowMs = useNowMs(1000);
  const { health, error } = useCyclesHealth();
  const band = bandFromHealth(health, nowMs);
  const stale =
    health?.atMs != null && nowMs - health.atMs > 12 * 60 * 60 * 1000;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          NNS account &amp; dfx cycles
        </CardTitle>
        <CardDescription>
          Replenish ICP from the Internet Computer NNS, then convert into the
          GitHub CI identity that tops up the <strong>dfx</strong> store
          canisters only. Caffeine production is retired and is not listed here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={bandBadgeClass(band)}>
            {band === "healthy"
              ? "healthy"
              : band === "month"
                ? "1 month"
                : band === "week"
                  ? "1 week"
                  : band === "day"
                    ? "1 day"
                    : "unknown"}
          </Badge>
          {stale && <Badge variant="secondary">sentinel stale</Badge>}
          {health?.at && (
            <span className="text-xs text-muted-foreground">
              Last measured {formatDdMmYyHhMmSsUtc(health.at)} UTC
            </span>
          )}
        </div>

        <div className="rounded-lg border p-4 bg-muted/40">
          <div className="text-sm font-medium mb-2">Store freeze (combined)</div>
          {error && !health && (
            <p className="text-sm text-muted-foreground">{error}</p>
          )}
          <RemainingClocks
            etaFreezeAt={health?.etaFreezeAt}
            etaZeroAt={health?.etaZeroAt}
            nowMs={nowMs}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={t.nnsAccountsUrl} target="_blank" rel="noreferrer">
              NNS accounts
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={t.storeUrl} target="_blank" rel="noreferrer">
              store.bammservice.com
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={sentinelWorkflowUrl()} target="_blank" rel="noreferrer">
              Cycles sentinel (live balances)
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <CopyField
          label="CI ICP account ID (NNS send target)"
          value={t.ciIcpAccountId}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <CanisterStatusRow
            label="Backend (dmg + exe)"
            id={t.backendCanisterId}
            etaFreezeAt={health?.backend?.etaFreezeAt}
            nowMs={nowMs}
          />
          <CanisterStatusRow
            label="Frontend (store UI)"
            id={t.frontendCanisterId}
            etaFreezeAt={health?.frontend?.etaFreezeAt}
            nowMs={nowMs}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Freeze at is <code>dd/mm/yy hh:mm:ss</code> UTC. Remaining is{" "}
          <code>DDDd HH:mm:ss</code> and ticks while this page is open. Clocks
          come from the dfx sentinel snapshot, not Motoko. Do not reinstall the
          backend to “fix” cycles.
        </p>
      </CardContent>
    </Card>
  );
}
