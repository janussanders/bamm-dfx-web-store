import { SUPPORT_EMAIL } from "@/legal/copy";
import { STOREFRONT_COMMIT, STOREFRONT_VERSION } from "@/lib/versions";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>&copy; 2026 BAMM SERVICES INC. All rights reserved.</p>
            <p>
              Support:{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p
              className="font-mono text-xs"
              title={`commit ${STOREFRONT_COMMIT}`}
            >
              Storefront {STOREFRONT_VERSION}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-primary"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-muted-foreground hover:text-primary"
            >
              Privacy
            </Link>
            <Link
              to="/refunds"
              className="text-muted-foreground hover:text-primary"
            >
              Refunds
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Built with{" "}
          <Heart className="h-4 w-4 text-destructive fill-destructive" />
        </div>
      </div>
    </footer>
  );
}
