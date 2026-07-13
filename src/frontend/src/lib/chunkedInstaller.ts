/**
 * Chunked installer upload/download for dfx (DDR-003 / DDR-041 Phase A).
 * IC ingress/query payloads are capped ~2–3 MiB; desktop installers are 100MB+.
 * Both paths use a concurrent worker pool so chunk RTTs overlap.
 */

export const DEFAULT_INSTALLER_CHUNK_BYTES = 1_500_000;

/** Concurrent workers for chunk transfer (DDR-041 Phase A). */
export const DEFAULT_CHUNK_CONCURRENCY = 6;

const CHUNK_TRANSFER_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveConcurrency(requested: number | undefined, total: number): number {
  const n =
    requested !== undefined && Number.isFinite(requested)
      ? Math.floor(requested)
      : DEFAULT_CHUNK_CONCURRENCY;
  return Math.max(1, Math.min(n, total));
}

async function mapPool<T>(
  total: number,
  concurrency: number,
  fn: (index: number) => Promise<T>,
  onItemDone?: (completed: number) => void,
): Promise<T[]> {
  const results: T[] = new Array(total);
  let nextIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= total) return;
      results[i] = await fn(i);
      completed += 1;
      onItemDone?.(completed);
    }
  }

  await Promise.all(
    Array.from({ length: resolveConcurrency(concurrency, total) }, () => worker()),
  );
  return results;
}

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

async function uploadChunkWithRetry(
  actor: ChunkedInstallerActor,
  platform: InstallerPlatform,
  chunkIndex: number,
  totalChunks: number,
  chunk: Uint8Array,
): Promise<void> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= CHUNK_TRANSFER_MAX_ATTEMPTS; attempt++) {
    try {
      const result =
        platform === "mac"
          ? await actor.uploadMacInstallerChunk(BigInt(chunkIndex), chunk)
          : await actor.uploadWindowsInstallerChunk(BigInt(chunkIndex), chunk);
      unwrapResult(result, `upload chunk ${chunkIndex + 1}/${totalChunks}`);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < CHUNK_TRANSFER_MAX_ATTEMPTS) {
        await sleep(200 * attempt);
      }
    }
  }
  throw lastError ?? new Error(`upload chunk ${chunkIndex + 1}/${totalChunks} failed`);
}

async function downloadChunkWithRetry(
  actor: ChunkedInstallerActor,
  platform: InstallerPlatform,
  chunkIndex: number,
  chunkCount: number,
): Promise<Uint8Array> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= CHUNK_TRANSFER_MAX_ATTEMPTS; attempt++) {
    try {
      const result =
        platform === "mac"
          ? await actor.downloadMacInstallerChunk(BigInt(chunkIndex))
          : await actor.downloadWindowsInstallerChunk(BigInt(chunkIndex));
      if (result.__kind__ === "err") {
        throw new Error(
          `download chunk ${chunkIndex + 1}/${chunkCount}: ${result.err}`,
        );
      }
      return result.ok.chunk;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < CHUNK_TRANSFER_MAX_ATTEMPTS) {
        await sleep(200 * attempt);
      }
    }
  }
  throw (
    lastError ?? new Error(`download chunk ${chunkIndex + 1}/${chunkCount} failed`)
  );
}

export async function uploadInstallerChunked(
  actor: ChunkedInstallerActor,
  platform: InstallerPlatform,
  file: File,
  onProgress?: (percent: number) => void,
  concurrency: number = DEFAULT_CHUNK_CONCURRENCY,
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
    // Backend stores chunks in a Map by index — order does not matter (DDR-005).
    await mapPool(
      totalChunks,
      concurrency,
      async (i) => {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        await uploadChunkWithRetry(
          actor,
          platform,
          i,
          totalChunks,
          bytes.subarray(start, end),
        );
      },
      (completed) => {
        onProgress?.(Math.min(99, Math.round((completed / totalChunks) * 100)));
      },
    );

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

/**
 * Download installer with concurrent IC query workers (DDR-041 Phase A).
 * Progress is completedChunks / chunkCount.
 */
export async function downloadInstallerChunked(
  actor: ChunkedInstallerActor,
  platform: InstallerPlatform,
  onProgress?: (percent: number) => void,
  concurrency: number = DEFAULT_CHUNK_CONCURRENCY,
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

  onProgress?.(1);

  const parts = await mapPool(
    chunkCount,
    concurrency,
    (i) => downloadChunkWithRetry(actor, platform, i, chunkCount),
    (completed) => {
      onProgress?.(Math.min(99, Math.round((completed / chunkCount) * 100)));
    },
  );

  const out = new Uint8Array(totalSize);
  let offset = 0;
  for (let i = 0; i < chunkCount; i++) {
    const chunk = parts[i];
    out.set(chunk, offset);
    offset += chunk.byteLength;
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
