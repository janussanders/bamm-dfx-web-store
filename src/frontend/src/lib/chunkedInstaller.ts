/**
 * Chunked installer upload/download for dfx (DDR-003).
 * IC ingress/query payloads are capped ~2–3 MiB; desktop installers are 100MB+.
 */

export const DEFAULT_INSTALLER_CHUNK_BYTES = 1_500_000;

export type InstallerPlatform = "mac" | "windows";

export type ChunkedInstallerActor = {
  getInstallerChunkMaxBytes(): Promise<bigint>;
  beginMacInstallerUpload(
    fileName: string,
    totalSize: bigint,
    totalChunks: bigint,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  uploadMacInstallerChunk(
    chunkIndex: bigint,
    chunk: Uint8Array,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  finalizeMacInstallerUpload(): Promise<
    { __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }
  >;
  cancelMacInstallerUpload(): Promise<void>;
  beginWindowsInstallerUpload(
    fileName: string,
    totalSize: bigint,
    totalChunks: bigint,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  uploadWindowsInstallerChunk(
    chunkIndex: bigint,
    chunk: Uint8Array,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  finalizeWindowsInstallerUpload(): Promise<
    { __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }
  >;
  cancelWindowsInstallerUpload(): Promise<void>;
  getPublicMacInstallerMeta(): Promise<
    | {
        fileName: string;
        mimeType: string;
        totalSize: bigint;
        chunkCount: bigint;
      }
    | undefined
    | null
  >;
  getPublicWindowsInstallerMeta(): Promise<
    | {
        fileName: string;
        mimeType: string;
        totalSize: bigint;
        chunkCount: bigint;
      }
    | undefined
    | null
  >;
  downloadMacInstallerChunk(chunkIndex: bigint): Promise<
    | { __kind__: "ok"; ok: { chunk: Uint8Array; chunkIndex: bigint; chunkCount: bigint } }
    | { __kind__: "err"; err: string }
  >;
  downloadWindowsInstallerChunk(chunkIndex: bigint): Promise<
    | { __kind__: "ok"; ok: { chunk: Uint8Array; chunkIndex: bigint; chunkCount: bigint } }
    | { __kind__: "err"; err: string }
  >;
};

function unwrapResult(
  result: { __kind__: "ok"; ok: string } | { __kind__: "err"; err: string },
  context: string,
): void {
  if (result.__kind__ === "err") {
    throw new Error(`${context}: ${result.err}`);
  }
}

export async function uploadInstallerChunked(
  actor: ChunkedInstallerActor,
  platform: InstallerPlatform,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  let chunkSize = DEFAULT_INSTALLER_CHUNK_BYTES;
  try {
    const max = await actor.getInstallerChunkMaxBytes();
    const n = Number(max);
    if (Number.isFinite(n) && n > 0) chunkSize = n;
  } catch {
    // keep default
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const totalSize = bytes.byteLength;
  const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));

  onProgress?.(1);

  if (platform === "mac") {
    unwrapResult(
      await actor.beginMacInstallerUpload(
        file.name,
        BigInt(totalSize),
        BigInt(totalChunks),
      ),
      "beginMacInstallerUpload",
    );
  } else {
    unwrapResult(
      await actor.beginWindowsInstallerUpload(
        file.name,
        BigInt(totalSize),
        BigInt(totalChunks),
      ),
      "beginWindowsInstallerUpload",
    );
  }

  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = bytes.subarray(start, end);
      const result =
        platform === "mac"
          ? await actor.uploadMacInstallerChunk(BigInt(i), chunk)
          : await actor.uploadWindowsInstallerChunk(BigInt(i), chunk);
      unwrapResult(result, `upload chunk ${i + 1}/${totalChunks}`);
      onProgress?.(Math.min(99, Math.round(((i + 1) / totalChunks) * 100)));
    }

    const finalized =
      platform === "mac"
        ? await actor.finalizeMacInstallerUpload()
        : await actor.finalizeWindowsInstallerUpload();
    unwrapResult(finalized, "finalizeInstallerUpload");
    onProgress?.(100);
  } catch (err) {
    try {
      if (platform === "mac") await actor.cancelMacInstallerUpload();
      else await actor.cancelWindowsInstallerUpload();
    } catch {
      // ignore cancel errors
    }
    throw err;
  }
}

export async function downloadInstallerChunked(
  actor: ChunkedInstallerActor,
  platform: InstallerPlatform,
  onProgress?: (percent: number) => void,
): Promise<{ fileName: string; mimeType: string; bytes: Uint8Array }> {
  const meta =
    platform === "mac"
      ? await actor.getPublicMacInstallerMeta()
      : await actor.getPublicWindowsInstallerMeta();

  if (!meta) {
    throw new Error(
      `${platform === "mac" ? "Mac" : "Windows"} installer not available. Please contact support.`,
    );
  }

  const chunkCount = Number(meta.chunkCount);
  const totalSize = Number(meta.totalSize);
  if (!Number.isFinite(chunkCount) || chunkCount < 1) {
    throw new Error("Invalid installer metadata (chunkCount)");
  }
  if (!Number.isFinite(totalSize) || totalSize < 1) {
    throw new Error("Invalid installer metadata (totalSize)");
  }

  const out = new Uint8Array(totalSize);
  let offset = 0;
  onProgress?.(1);

  for (let i = 0; i < chunkCount; i++) {
    const result =
      platform === "mac"
        ? await actor.downloadMacInstallerChunk(BigInt(i))
        : await actor.downloadWindowsInstallerChunk(BigInt(i));
    if (result.__kind__ === "err") {
      throw new Error(`download chunk ${i + 1}/${chunkCount}: ${result.err}`);
    }
    const chunk = result.ok.chunk;
    out.set(chunk, offset);
    offset += chunk.byteLength;
    onProgress?.(Math.min(99, Math.round(((i + 1) / chunkCount) * 100)));
  }

  if (offset !== totalSize) {
    throw new Error(
      `Downloaded size mismatch: got ${offset} bytes, expected ${totalSize}`,
    );
  }

  onProgress?.(100);
  return {
    fileName: meta.fileName,
    mimeType: meta.mimeType,
    bytes: out,
  };
}
