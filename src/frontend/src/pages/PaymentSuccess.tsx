import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActor } from "@/hooks/useActor";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  CheckCircle,
  Home,
  Loader2,
  Mail,
  Package,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import RegulatedFeatureDisclaimer from "../components/RegulatedFeatureDisclaimer";
import {
  PAYMENT_PENDING_SUPPORT,
  PAYMENT_SUCCESS_ALERT,
  PAYMENT_SUCCESS_HEADLINE,
  PAYMENT_SUCCESS_NEXT_1,
  PAYMENT_SUCCESS_NEXT_2,
  PAYMENT_SUCCESS_NEXT_3,
  PAYMENT_SUCCESS_PRIVACY_NOTE,
  isRegulatedFeature,
} from "../legal/marketing";

type PageState =
  | { kind: "loading"; attempt?: number }
  | {
      kind: "success";
      sessionId: string;
      customerEmail: string;
      customerName: string;
      features: string[];
      bamm_transaction_id: string;
      amountTotal: bigint;
    }
  | { kind: "error"; message: string; sessionId?: string }
  | { kind: "no_session" };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const PAYMENT_PENDING_MESSAGE = `Payment received. Verification is taking longer than expected. Your license will be emailed shortly. ${PAYMENT_PENDING_SUPPORT}`;

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/payment-success" });
  const { actor, isFetching } = useActor();
  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });

  const sessionId = (search as { session_id?: string }).session_id ?? "";

  const runFulfillment = useCallback(async () => {
    if (!sessionId) {
      setPageState({ kind: "no_session" });
      return;
    }
    if (!actor || isFetching) {
      return;
    }

    setPageState({ kind: "loading", attempt: 1 });

    try {
      let rawResult = await actor.getStripeSessionStatus(sessionId);

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setPageState({ kind: "loading", attempt });
        await sleep(RETRY_DELAY_MS);

        rawResult = await actor.getStripeSessionStatus(sessionId);

        if (rawResult.__kind__ === "err") {
          console.warn(
            `[PaymentSuccess] getStripeSessionStatus err (attempt ${attempt}):`,
            rawResult.err,
          );
          if (attempt === MAX_ATTEMPTS) break;
          continue;
        }

        const { status } = rawResult.ok;
        if (status === "paid" || status === "complete") {
          break;
        }
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `[PaymentSuccess] Attempt ${attempt}/${MAX_ATTEMPTS}: status=${status} for ${sessionId}`,
          );
        }
      }

      if (rawResult.__kind__ === "err") {
        setPageState({
          kind: "error",
          message: PAYMENT_PENDING_MESSAGE,
          sessionId,
        });
        return;
      }

      const {
        customerEmail,
        customerName,
        features,
        bamm_transaction_id,
        amountTotal,
        status,
      } = rawResult.ok;

      if (status !== "paid" && status !== "complete") {
        setPageState({
          kind: "error",
          message: PAYMENT_PENDING_MESSAGE,
          sessionId,
        });
        return;
      }

      const licenseResult = await actor.fulfillPaidLicense(sessionId);

      if (licenseResult.__kind__ === "err") {
        console.error(
          "[PaymentSuccess] fulfillPaidLicense failed:",
          licenseResult.err,
        );
        setPageState({
          kind: "error",
          message: PAYMENT_PENDING_MESSAGE,
          sessionId,
        });
        return;
      }

      setPageState({
        kind: "success",
        sessionId,
        customerEmail,
        customerName,
        features,
        bamm_transaction_id,
        amountTotal,
      });
    } catch (err) {
      console.error(
        "[PaymentSuccess] Unhandled error during payment confirmation:",
        err,
      );
      setPageState({
        kind: "error",
        message: PAYMENT_PENDING_MESSAGE,
        sessionId,
      });
    }
  }, [actor, isFetching, sessionId]);

  useEffect(() => {
    void runFulfillment();
  }, [runFulfillment]);

  const handleRetry = () => {
    void runFulfillment();
  };

  if (pageState.kind === "no_session") {
    return (
      <div className="container py-20">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">No Payment Session Found</h1>
          <p className="text-muted-foreground">
            We couldn't find a payment session for this page. If you completed a
            purchase, please check your email for your license.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate({ to: "/premium" })}
              variant="default"
              data-ocid="payment_success.premium_button"
            >
              <Package className="mr-2 h-4 w-4" />
              View Premium Features
            </Button>
            <Button
              onClick={() => navigate({ to: "/" })}
              variant="outline"
              data-ocid="payment_success.home_button"
            >
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pageState.kind === "loading") {
    const attempt = pageState.attempt ?? 0;
    const attemptLabel =
      attempt >= 2 ? ` (attempt ${attempt}/${MAX_ATTEMPTS})` : "";
    const waitingForActor = !actor || isFetching;
    return (
      <div className="container py-20">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto ring-4 ring-primary/20">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-bold">Processing Your Order…</h1>
          <p className="text-muted-foreground">
            {waitingForActor
              ? "Connecting to BAMM services…"
              : attempt >= 1
                ? `Verifying payment${attemptLabel}…`
                : "Preparing payment verification…"}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Do not close this page</span>
          </div>
        </div>
      </div>
    );
  }

  if (pageState.kind === "error") {
    const displaySessionId = pageState.sessionId || sessionId || "N/A";
    const canRetry = Boolean(actor && !isFetching && sessionId);
    return (
      <div className="container py-20">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto ring-4 ring-amber-500/20">
              <Mail className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold">Verification Pending</h1>
          </div>
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <Mail className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-400">
              {pageState.message}
            </AlertDescription>
          </Alert>
          <Card className="bg-muted/40">
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Your payment reference number:
              </p>
              <p className="font-mono text-xs break-all bg-background p-2 rounded border border-border select-all">
                {displaySessionId}
              </p>
              <p className="text-xs text-muted-foreground">
                Keep this reference handy when contacting support.
              </p>
            </CardContent>
          </Card>
          <div className="flex flex-col sm:flex-row gap-3">
            {canRetry && (
              <Button
                onClick={handleRetry}
                variant="default"
                className="flex-1"
                data-ocid="payment_success.retry_button"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry License Delivery
              </Button>
            )}
            <Button
              onClick={() => navigate({ to: "/premium" })}
              variant="outline"
              className="flex-1"
            >
              <Package className="mr-2 h-4 w-4" />
              View Premium
            </Button>
            <Button
              onClick={() => navigate({ to: "/" })}
              variant="outline"
              className="flex-1"
              data-ocid="payment_success.home_button"
            >
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { customerEmail, features, bamm_transaction_id, amountTotal } =
    pageState;
  const shortTransactionId = bamm_transaction_id
    ? `BAMM-${bamm_transaction_id.slice(-4).toUpperCase()}`
    : "BAMM-???";
  const amountDisplay = amountTotal
    ? `$${(Number(amountTotal) / 100).toFixed(2)}`
    : "—";

  return (
    <div className="container py-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto ring-4 ring-green-500/20">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            {PAYMENT_SUCCESS_HEADLINE}
          </h1>
          <p className="text-lg text-muted-foreground">
            Your license has been sent to{" "}
            <span className="font-semibold text-foreground">
              {customerEmail}
            </span>
          </p>
        </div>

        <Alert className="border-green-500/40 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">
            {PAYMENT_SUCCESS_ALERT} Check <strong>{customerEmail}</strong>.
          </AlertDescription>
        </Alert>

        {features.some((f) => isRegulatedFeature(f)) && (
          <RegulatedFeatureDisclaimer variant="checkout" />
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Purchase Details</CardTitle>
                <CardDescription>Your transaction information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-4 p-3 bg-muted/40 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  BAMM Transaction ID
                </p>
                <p
                  className="font-mono text-sm mt-0.5 font-bold tracking-widest"
                  data-ocid="payment_success.payment_id"
                >
                  {shortTransactionId}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-green-400 border-green-500/40 shrink-0"
              >
                Confirmed
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-4 p-3 bg-muted/40 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Amount Paid
                </p>
                <p
                  className="text-sm font-medium mt-0.5"
                  data-ocid="payment_success.amount"
                >
                  {amountDisplay}
                </p>
              </div>
              <Mail className="h-4 w-4 text-primary shrink-0" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  License Sent To
                </p>
                <p
                  className="text-sm font-medium mt-0.5"
                  data-ocid="payment_success.email"
                >
                  {customerEmail}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Features Purchased
              </p>
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <Badge
                    key={f}
                    variant="secondary"
                    className="text-xs"
                    data-ocid={`payment_success.feature.${f.toLowerCase().replace(/\s+/g, "_")}`}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">What Happens Next?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              ✓ {PAYMENT_SUCCESS_NEXT_1}{" "}
              <strong className="text-foreground">{customerEmail}</strong>.
            </p>
            <p>✓ {PAYMENT_SUCCESS_NEXT_2}</p>
            <p>✓ {PAYMENT_SUCCESS_NEXT_3}</p>
            <p className="text-xs pt-2">{PAYMENT_SUCCESS_PRIVACY_NOTE}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => navigate({ to: "/download-success" })}
            data-ocid="payment_success.download_button"
          >
            <Package className="mr-2 h-5 w-5" />
            Download BAMM
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => navigate({ to: "/" })}
            data-ocid="payment_success.home_button"
          >
            <Home className="mr-2 h-5 w-5" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
