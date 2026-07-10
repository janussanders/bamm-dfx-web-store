import type {
  EntitlementRegistryEntry,
  EntitlementWorkflowStep,
  LinkedPremiumPurchaseView,
} from "@/backend";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBackfillEntitlementsFromPurchases,
  useGetEntitlementRegistry,
  useResetEntitlementActivation,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

function optStr(value: [] | [string] | string | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return value.length > 0 ? value[0] : undefined;
}

function entitlementStatusChipClass(status: string): string {
  const map: Record<string, string> = {
    pending_activation: "bg-amber-500 text-white",
    activated: "bg-green-600 text-white",
    forfeited: "bg-red-600 text-white",
    expired: "bg-muted text-muted-foreground",
  };
  return map[status] ?? "bg-secondary text-secondary-foreground";
}

function workflowStepLabel(step: string): string {
  const map: Record<string, string> = {
    entitlement_created: "Created",
    entitlement_merged: "Merged",
    entitlement_features_merged: "Features merged",
    entitlement_reopened: "Reopened",
    admin_license_generated: "Admin generated",
    admin_manual_send: "Admin manual send",
    purchase_fulfilled: "Purchase fulfilled",
    purchase_backfilled: "Purchase backfilled",
    license_emailed: "License emailed",
    entitlement_activated: "Activated",
    entitlement_activation_reset: "Activation reset",
  };
  return map[step] ?? step.replaceAll("_", " ");
}

function formatIso(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatNsTimestamp(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleString();
}

function LinkedPurchasesTable({
  purchases,
}: {
  purchases: LinkedPremiumPurchaseView[];
}) {
  if (purchases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No linked premium purchases yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transaction ID</TableHead>
          <TableHead>Stripe session</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Features</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {purchases.map((p) => (
          <TableRow key={`${p.transactionId}-${p.stripeSessionId}`}>
            <TableCell className="font-mono text-xs">
              {p.transactionId}
            </TableCell>
            <TableCell>
              <code title={p.stripeSessionId} className="text-xs font-mono">
                {p.stripeSessionId
                  ? `${p.stripeSessionId.substring(0, 16)}…`
                  : "—"}
              </code>
            </TableCell>
            <TableCell>{p.customerName || "—"}</TableCell>
            <TableCell>${(Number(p.amount) / 100).toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant="outline">{p.status}</Badge>
            </TableCell>
            <TableCell>
              <Badge
                className={
                  p.paymentConfirmation === "paid"
                    ? "bg-green-600 text-white"
                    : "bg-yellow-600 text-white"
                }
              >
                {p.paymentConfirmation || "pending"}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">
              {formatIso(p.purchasedAtIso)}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {p.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs">
                    {f}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WorkflowTimeline({ steps }: { steps: EntitlementWorkflowStep[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No workflow steps recorded yet.
      </p>
    );
  }

  const ordered = [...steps].sort(
    (a, b) => Number(a.timestamp) - Number(b.timestamp),
  );

  return (
    <ol className="space-y-3 border-l border-border ml-2 pl-4">
      {ordered.map((step, idx) => {
        const sessionId = optStr(step.stripeSessionId);
        return (
          <li
            key={`${step.step}-${step.timestamp}-${idx}`}
            className="relative"
          >
            <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{workflowStepLabel(step.step)}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatNsTimestamp(step.timestamp)}
              </span>
            </div>
            <p className="text-sm mt-1">{step.message}</p>
            {sessionId ? (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Stripe session: {sessionId.substring(0, 20)}…
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function EntitlementRow({ entry }: { entry: EntitlementRegistryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const resetActivation = useResetEntitlementActivation();
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const e = entry.entitlement;
  const activatedAt = optStr(e.activatedAtIso);
  const expiresAt = optStr(e.expiresIso);
  const machineDigest = optStr(e.machineBindingDigest);

  const runReset = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setResetMessage(null);
    try {
      await resetActivation.mutateAsync(e.entitlementId);
      setResetMessage(
        "Activation reset — customer can Finish Premium setup again.",
      );
    } catch (err) {
      setResetMessage(
        err instanceof Error ? err.message : "Reset activation failed",
      );
    }
  };

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">{e.entitlementId}</TableCell>
        <TableCell>{e.email}</TableCell>
        <TableCell>
          <Badge className={entitlementStatusChipClass(e.status)}>
            {e.status.replaceAll("_", " ")}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1 max-w-xs">
            {e.features.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="text-xs">
          {formatIso(entry.purchasedAtIso)}
        </TableCell>
        <TableCell className="text-xs">
          {activatedAt ? formatIso(activatedAt) : "—"}
        </TableCell>
        <TableCell className="text-xs">
          {expiresAt ? formatIso(expiresAt) : "—"}
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{entry.linkedPurchases.length}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{entry.workflowSteps.length}</Badge>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Lifecycle</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Activation deadline</dt>
                  <dd>{formatIso(e.activationDeadlineIso)}</dd>
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd>{formatIso(entry.updatedAtIso)}</dd>
                  <dt className="text-muted-foreground">Machine binding</dt>
                  <dd className="font-mono text-xs break-all">
                    {machineDigest
                      ? `${machineDigest.substring(0, 16)}…`
                      : "Not bound"}
                  </dd>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={resetActivation.isPending}
                  onClick={(ev) => void runReset(ev)}
                >
                  {resetActivation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Reset activation
                </Button>
                {resetMessage ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    {resetMessage}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Workflow log</h4>
                <WorkflowTimeline steps={entry.workflowSteps} />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-semibold">
                Linked premium purchases
              </h4>
              <p className="text-xs text-muted-foreground">
                Cross-referenced by entitlement ID and customer email.
              </p>
              <LinkedPurchasesTable purchases={entry.linkedPurchases} />
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export default function EntitlementRegistryPanel() {
  const { data, isLoading, isFetching, refetch } = useGetEntitlementRegistry();
  const backfill = useBackfillEntitlementsFromPurchases();
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);

  const entries = useMemo(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) =>
        new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime(),
    );
  }, [data]);

  const runBackfill = async () => {
    setBackfillMessage(null);
    try {
      const result = await backfill.mutateAsync();
      setBackfillMessage(
        `Backfill complete: created ${result.created}, linked ${result.linked}, ` +
          `skipped (already linked ${result.skippedAlreadyLinked}, no features ${result.skippedNoFeatures}, ` +
          `status ${result.skippedIneligibleStatus}). Registry size: ${result.registrySize}.`,
      );
    } catch (err) {
      setBackfillMessage(
        err instanceof Error ? err.message : "Backfill failed",
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Entitlements</CardTitle>
          <CardDescription>
            One registry row per customer email (new Stripe checkouts merge into
            the same entitlement — purchases and workflow steps accumulate
            underneath). Historical paid purchases need a one-time backfill
            before they appear here.
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runBackfill()}
              disabled={backfill.isPending || isFetching}
            >
              {backfill.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              <span className={backfill.isPending ? "ml-2" : undefined}>
                Backfill from purchases
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
          {backfillMessage ? (
            <p className="text-xs text-muted-foreground max-w-md text-right">
              {backfillMessage}
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading entitlements…
          </div>
        ) : entries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Entitlement ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Purchased</TableHead>
                <TableHead>Activated</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Purchases</TableHead>
                <TableHead>Log</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <EntitlementRow
                  key={entry.entitlement.entitlementId}
                  entry={entry}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className={cn("text-muted-foreground text-center py-8")}>
            No entitlements yet. New Stripe checkouts create them automatically.
            For historical paid purchases, use{" "}
            <span className="font-medium text-foreground">
              Backfill from purchases
            </span>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function EntitlementStatusChip({ status }: { status: string }) {
  if (!status) return null;
  return (
    <Badge className={cn("text-xs", entitlementStatusChipClass(status))}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
