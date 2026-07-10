import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  X,
  XCircle,
} from "lucide-react";

export interface PipelineStep {
  step: string;
  message: string;
  timestamp: bigint;
}

export interface TransactionLog {
  id: string; // Stripe session ID
  recipientEmail: string;
  customerName: string;
  transactionId: string; // BAMM-XXXX
  features: string[];
  amountPaid: string; // dollars as text, e.g. "0.52"
  licenseStatus: string; // "sent" | "failed" | "pending"
  createdAt: bigint;
  updatedAt: bigint;
  pipelineSteps: PipelineStep[];
}

interface TransactionModalProps {
  transaction: TransactionLog | null;
  open: boolean;
  onClose: () => void;
}

function formatAmount(amountPaid: string): string {
  if (!amountPaid || amountPaid === "0" || amountPaid === "0.00") return "—";
  const num = Number.parseFloat(amountPaid);
  if (Number.isNaN(num) || num === 0) return "—";
  return amountPaid.startsWith("$")
    ? amountPaid
    : `$${Number.parseFloat(amountPaid).toFixed(2)}`;
}

function formatTimestamp(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleString();
}

function formatTime(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleTimeString();
}

function humanizeStep(step: string): string {
  const map: Record<string, string> = {
    checkout_created: "Checkout Created",
    payment_confirmed: "Payment Confirmed",
    payment_pending: "Payment Pending",
    features_warning: "Features Warning",
    submission_added: "Submission Added",
    license_sent: "License Sent",
    debug: "Debug Info",
    stripe_checkout: "Stripe Checkout",
    stripe_debug: "Stripe Debug",
    stripe_features: "Stripe Features",
    stripe_payment: "Stripe Payment",
    stripe_submission: "Stripe Submission",
  };
  return (
    map[step] ??
    step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function StepIcon({ step }: { step: string }) {
  if (step === "features_warning" || step === "stripe_features") {
    return (
      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
    );
  }
  if (step === "failed") {
    return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        Sent
      </Badge>
    );
  }
  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return (
    <Badge
      variant="secondary"
      className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    >
      Pending
    </Badge>
  );
}

export default function TransactionModal({
  transaction,
  open,
  onClose,
}: TransactionModalProps) {
  if (!transaction) return null;

  const handleDownload = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          transaction,
          (_key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BAMM-Transaction-${transaction.transactionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sessionIdShort =
    transaction.id.length > 20
      ? `…${transaction.id.slice(-20)}`
      : transaction.id;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between gap-2 pb-2 border-b border-border">
          <DialogTitle className="text-lg font-semibold">
            Transaction Details
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -mt-1"
            onClick={onClose}
            aria-label="Close"
            data-ocid="transaction_modal.close_button"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm py-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              BAMM Transaction ID
            </p>
            <p className="font-bold text-foreground">
              {transaction.transactionId || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              License Status
            </p>
            <StatusBadge status={transaction.licenseStatus} />
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-0.5">
              Stripe Session ID
            </p>
            <p
              className="font-mono text-xs text-foreground truncate cursor-help"
              title={transaction.id}
            >
              {sessionIdShort}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              Recipient Email
            </p>
            <p className="text-foreground">
              {transaction.recipientEmail || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              Customer Name
            </p>
            <p className="text-foreground">{transaction.customerName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Amount Paid</p>
            <p className="font-semibold text-foreground">
              {formatAmount(transaction.amountPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Date / Time</p>
            <p className="text-foreground">
              {formatTimestamp(transaction.createdAt)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-1">
              Features Purchased
            </p>
            <div className="flex flex-wrap gap-1">
              {transaction.features.length > 0 ? (
                transaction.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs">
                    {f}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Steps */}
        {transaction.pipelineSteps.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold mb-3">Pipeline Steps</p>
            <ol className="space-y-3">
              {transaction.pipelineSteps.map((step, i) => (
                <li key={`${step.step}-${i}`} className="flex gap-3">
                  <StepIcon step={step.step} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {humanizeStep(step.step)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(step.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {step.message}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-border pt-4 mt-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            data-ocid="transaction_modal.download_button"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Transaction Log (.json)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            data-ocid="transaction_modal.cancel_button"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
