import { ExternalBlob } from "@/backend";
import { useFeatureImage } from "@/hooks/useQueries";
import { ImageIcon, Loader2 } from "lucide-react";

type Props = {
  featureId: string;
  /** Embedded bytes from list query (legacy); preferred path is getFeatureImage. */
  embedded?: Uint8Array;
  alt: string;
  className?: string;
  /** When true, render nothing if no image (storefront cards). */
  hideWhenEmpty?: boolean;
};

/** Thumbnail that loads via getFeatureImage when list queries omit blobs (DDR-039). */
export function FeatureImageThumb({
  featureId,
  embedded,
  alt,
  className = "w-full h-full object-cover",
  hideWhenEmpty = false,
}: Props) {
  const { data: bytes, isLoading } = useFeatureImage(featureId, embedded);

  if (isLoading && !bytes) {
    if (hideWhenEmpty) return null;
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (!bytes) {
    if (hideWhenEmpty) return null;
    return <ImageIcon className="h-6 w-6 text-muted-foreground" />;
  }
  return (
    <img
      src={ExternalBlob.fromBytes(bytes).getDirectURL()}
      alt={alt}
      className={className}
    />
  );
}
