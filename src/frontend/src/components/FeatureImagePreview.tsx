import { ExternalBlob } from "@/backend";
import { useFeatureImage } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { FeatureLightboxState } from "./FeatureImageLightbox";

type Props = {
  featureId: string;
  alt: string;
  embedded?: Uint8Array;
  /** Show View chip and open lightbox on activate (DDR-040). */
  enableLightbox?: boolean;
  /** Premium card: stopPropagation so parent selection onClick is untouched. */
  isolateClicks?: boolean;
  className?: string;
  /** Applied to the img element (e.g. max-h-80 object-contain). */
  imgClassName?: string;
  /** When true, render nothing if no image. */
  hideWhenEmpty?: boolean;
  /**
   * Parent list query finished (success or error). Homepage Free must pass this
   * so we do not race-cache a null getFeatureImage before embedded bytes arrive.
   */
  listSettled?: boolean;
  onOpenLightbox?: (state: NonNullable<FeatureLightboxState>) => void;
};

/**
 * Feature marketing preview with optional View lightbox (DDR-040).
 * Does not participate in Stripe selection when isolateClicks is set.
 */
export function FeatureImagePreview({
  featureId,
  alt,
  embedded,
  enableLightbox = false,
  isolateClicks = false,
  className,
  imgClassName = "w-full h-auto object-contain max-h-80",
  hideWhenEmpty = false,
  listSettled = true,
  onOpenLightbox,
}: Props) {
  const { data: bytes, isLoading } = useFeatureImage(featureId, embedded, {
    listSettled,
  });
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (isLoading && !bytes) {
    if (hideWhenEmpty) return null;
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted/40 border border-border/50 min-h-[8rem]",
          className,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bytes) {
    if (hideWhenEmpty) return null;
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted/40 border border-border/50 min-h-[8rem]",
          className,
        )}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  const open = () => {
    if (!enableLightbox || !onOpenLightbox) return;
    onOpenLightbox({ alt, bytes });
  };

  const handleActivate = (
    e: React.MouseEvent | React.KeyboardEvent,
  ) => {
    if (isolateClicks) {
      e.stopPropagation();
    }
    if (!enableLightbox) return;
    if ("key" in e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
    }
    open();
  };

  if (!enableLightbox) {
    return (
      <div
        className={cn(
          "rounded-lg overflow-hidden bg-muted/40 border border-border/50",
          className,
        )}
      >
        <img
          src={ExternalBlob.fromBytes(bytes).getDirectURL()}
          alt={alt}
          className={imgClassName}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View larger image of ${alt}`}
      className={cn(
        "group relative rounded-lg overflow-hidden bg-muted/40 border border-border/50 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={handleActivate}
      onKeyDown={handleActivate}
    >
      <img
        src={ExternalBlob.fromBytes(bytes).getDirectURL()}
        alt=""
        className={imgClassName}
        draggable={false}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors",
          canHover
            ? "group-hover:bg-black/35 group-focus-visible:bg-black/35"
            : "bg-black/25",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-opacity",
            canHover
              ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              : "opacity-100",
          )}
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          View
        </span>
      </div>
    </div>
  );
}
