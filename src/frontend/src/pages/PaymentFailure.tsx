import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, XCircle } from "lucide-react";
import {
  PAYMENT_FAILURE_BANK_NOTE,
  PAYMENT_FAILURE_SUBHEAD,
  PAYMENT_FAILURE_SUPPORT,
} from "../legal/marketing";

export default function PaymentFailure() {
  const navigate = useNavigate();

  return (
    <div className="container py-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Payment Failed</h1>
          <p className="text-lg text-muted-foreground">
            {PAYMENT_FAILURE_SUBHEAD}
          </p>
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Common Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Insufficient funds in your account</li>
              <li>Incorrect card details</li>
              <li>Card expired or blocked</li>
              <li>Payment declined by your bank</li>
            </ul>
            <p className="text-sm text-muted-foreground pt-4">
              {PAYMENT_FAILURE_BANK_NOTE} {PAYMENT_FAILURE_SUPPORT}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => navigate({ to: "/premium" })}
            className="flex-1"
            size="lg"
          >
            Try Again
          </Button>
          <Button
            onClick={() => navigate({ to: "/" })}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
