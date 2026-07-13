import { ExternalBlob } from "@/backend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type FeatureLightboxState = {
  alt: string;
  bytes: Uint8Array;
} | null;

type Props = {
  lightbox: FeatureLightboxState;
  onOpenChange: (open: boolean) => void;
};

/** Large-image dialog for Free/Premium marketing screenshots (DDR-040). */
export function FeatureImageLightbox({ lightbox, onOpenChange }: Props) {
  return (
    <Dialog open={!!lightbox} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[calc(100%-1.5rem)] sm:max-w-4xl p-4 sm:p-6 gap-3"
        aria-describedby={undefined}
      >
        {lightbox && (
          <>
            <DialogHeader className="pr-8">
              <DialogTitle className="text-left text-base sm:text-lg">
                {lightbox.alt}
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-lg overflow-hidden bg-muted/40 border border-border/50 max-h-[min(80vh,56rem)] flex items-center justify-center">
              <img
                src={ExternalBlob.fromBytes(lightbox.bytes).getDirectURL()}
                alt={lightbox.alt}
                className="w-full h-auto max-h-[min(80vh,56rem)] object-contain"
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
