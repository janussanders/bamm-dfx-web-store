import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";
import { Home, MoveLeft } from "lucide-react";
import { SUPPORT_EMAIL } from "../legal/copy";
import { LEGAL_ENTITY_DISPLAY } from "../legal/marketing";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-16 space-y-8">
      {/* Large 404 display */}
      <div className="space-y-2">
        <p className="text-8xl font-black text-primary/20 select-none tracking-tighter">
          404
        </p>
        <h1 className="text-3xl font-bold text-foreground">Page Not Found</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The page you're looking for doesn't exist or may have been moved. If
          you were completing a purchase, your payment was not affected.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={() => router.history.back()}
          className="gap-2"
          data-ocid="notfound.back_button"
        >
          <MoveLeft className="h-4 w-4" />
          Go Back
        </Button>
        <Button
          onClick={() => router.navigate({ to: "/" })}
          className="gap-2"
          data-ocid="notfound.home_button"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      {/* Support note */}
      <p className="text-xs text-muted-foreground">
        Need help?{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Contact {LEGAL_ENTITY_DISPLAY} support
        </a>
      </p>
    </div>
  );
}
