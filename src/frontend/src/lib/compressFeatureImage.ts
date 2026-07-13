/**
 * Compress marketing images before canister upload (DDR-039).
 * IC query responses are capped ~3 MiB — list queries used to embed every feature
 * image and failed after several uploads, making Features Management look empty.
 */
export async function compressFeatureImage(
  file: File,
  options?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<Uint8Array> {
  const maxEdge = options?.maxEdge ?? 1280;
  const quality = options?.quality ?? 0.72;
  const maxBytes = options?.maxBytes ?? 450_000;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    const raw = new Uint8Array(await file.arrayBuffer());
    if (raw.byteLength > 1_500_000) {
      throw new Error("Image is too large to upload (max ~1.5 MiB)");
    }
    return raw;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let blob: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", q),
    );
    if (!blob) break;
    if (blob.size <= maxBytes) break;
    q = Math.max(0.4, q - 0.08);
  }

  if (!blob) {
    const raw = new Uint8Array(await file.arrayBuffer());
    if (raw.byteLength > 1_500_000) {
      throw new Error("Image is too large to upload (max ~1.5 MiB)");
    }
    return raw;
  }

  if (blob.size > 1_500_000) {
    throw new Error(
      "Compressed image still exceeds ingress limit — use a smaller screenshot",
    );
  }

  return new Uint8Array(await blob.arrayBuffer());
}
