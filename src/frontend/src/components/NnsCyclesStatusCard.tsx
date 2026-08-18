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
  DFX_STORE_TARGETS,
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
  controllers?: string[];
};

function usePublicCanister(id: string) {
  const [data, setData] = useState<PublicCanisterInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "IC API unavailable");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return { data, error };
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

function CanisterStatusRow({
  label,
  id,
}: {
  label: string;
  id: string;
}) {
  const { data, error } = usePublicCanister(id);
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="outline">{id.slice(0, 5)}…</Badge>
        {data ? (
          <Badge>on subnet</Badge>
        ) : error ? (
          <Badge variant="secondary">dashboard for live cycles</Badge>
        ) : (
          <Badge variant="secondary">loading</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-mono break-all">{id}</p>
      {data?.updated_at && (
        <p className="text-xs text-muted-foreground">
          IC index updated {new Date(data.updated_at).toLocaleString()} · subnet{" "}
          <span className="font-mono">{data.subnet_id?.slice(0, 12)}…</span>
        </p>
      )}
      {error && (
        <p className="text-xs text-muted-foreground">
          Public cycle balances are controller-only. Open the IC dashboard or
          the sentinel workflow for Balance / freeze ETA.
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
          <CanisterStatusRow label="Backend (dmg + exe)" id={t.backendCanisterId} />
          <CanisterStatusRow label="Frontend (store UI)" id={t.frontendCanisterId} />
        </div>

        <p className="text-xs text-muted-foreground">
          Phase 1 freeze ETAs (1 month / 1 week / 1 day) are emailed to the
          configured Super Admin fallback list from GitHub Actions. This page
          does not call Motoko and cannot wipe installers. Do not reinstall the
          backend to “fix” cycles.
        </p>
      </CardContent>
    </Card>
  );
}
