import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type RegulatedFeatureVariant = "trades" | "tx_simulator" | "checkout";

const COPY: Record<RegulatedFeatureVariant, { title: string; body: string }> = {
  trades: {
    title: "Trading risk disclosure",
    body:
      "Trades connects to your broker to place orders. BAMM SERVICES INC. does not provide investment advice. " +
      "Trading involves substantial risk of loss. You are solely responsible for your decisions.",
  },
  tx_simulator: {
    title: "Tx Simulator disclaimer",
    body:
      "Tx Simulator outputs are estimates for planning only—not tax or legal advice. " +
      "Consult a qualified tax professional before filing.",
  },
  checkout: {
    title: "Before you purchase Trades or Tx Simulator",
    body:
      "These features involve trading and tax estimation tools. They are not investment, tax, or legal advice. " +
      "Purchasing a license does not guarantee profits or filing outcomes.",
  },
};

export default function RegulatedFeatureDisclaimer({
  variant,
}: {
  variant: RegulatedFeatureVariant;
}) {
  const { title, body } = COPY[variant];
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{body}</AlertDescription>
    </Alert>
  );
}
