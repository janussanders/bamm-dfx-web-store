/**
 * Local ExternalBlob shim for dfx (DDR-003).
 * Replaces @caffeineai/object-storage — bytes live in-memory / on-canister as Blob.
 */

export class ExternalBlob {
  private bytes: Uint8Array;
  private objectUrl: string | null = null;
  /** Caffeine-compatible field used by @caffeineai/core-infrastructure typing. */
  directURL: string = "";
  onProgress?: (percentage: number) => void;

  private constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  static fromBytes(blob: Uint8Array): ExternalBlob {
    return new ExternalBlob(blob);
  }

  static fromURL(url: string): ExternalBlob {
    const instance = new ExternalBlob(new Uint8Array());
    instance.directURL = url;
    instance.objectUrl = url;
    return instance;
  }

  async getBytes(): Promise<Uint8Array> {
    if (this.onProgress) {
      this.onProgress(100);
    }
    return this.bytes;
  }

  getDirectURL(): string {
    if (!this.objectUrl) {
      const copy = Uint8Array.from(this.bytes);
      this.objectUrl = URL.createObjectURL(new Blob([copy]));
      this.directURL = this.objectUrl;
    }
    return this.objectUrl;
  }

  withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob {
    this.onProgress = onProgress;
    return this;
  }
}

/** Identity upload: ExternalBlob → candid vec nat8 (no caffeine gateway). */
export async function identityUploadFile(file: ExternalBlob): Promise<Uint8Array> {
  return file.getBytes();
}

/** Identity download: candid vec nat8 → ExternalBlob (no caffeine gateway). */
export async function identityDownloadFile(file: Uint8Array): Promise<ExternalBlob> {
  return ExternalBlob.fromBytes(file);
}

/** Build a display URL from raw canister bytes. */
export function bytesToObjectURL(bytes: Uint8Array, mimeType?: string): string {
  const copy = Uint8Array.from(bytes);
  return URL.createObjectURL(new Blob([copy], mimeType ? { type: mimeType } : undefined));
}
