/**
 * Version helpers (DDR-029).
 * Storefront tag (Caffeine/git) is independent of desktop installer semver.
 */

import {
  STOREFRONT_COMMIT,
  STOREFRONT_VERSION,
} from "@/generated/storefrontVersion";

export { STOREFRONT_COMMIT, STOREFRONT_VERSION };

/** Canonical BAMM desktop installer filenames from GitHub Releases. */
export type DesktopInstallerInfo = {
  version: string;
  tag: string;
  platform: "mac" | "windows";
  unsigned: boolean;
  fileName: string;
};

/**
 * Parse GitHub-published installer names:
 *   BAMM-{semver}-arm64.dmg
 *   BAMM-{semver}-arm64-UNSIGNED.dmg
 *   BAMM-{semver}.exe
 */
export function parseDesktopInstallerFileName(
  fileName: string | null | undefined,
): DesktopInstallerInfo | null {
  if (!fileName) return null;
  const base = fileName.trim().split(/[/\\]/).pop() ?? fileName;

  const mac = /^BAMM-(\d+\.\d+\.\d+)-arm64(-UNSIGNED)?\.dmg$/i.exec(base);
  if (mac) {
    return {
      version: mac[1],
      tag: `v${mac[1]}`,
      platform: "mac",
      unsigned: Boolean(mac[2]),
      fileName: base,
    };
  }

  const win = /^BAMM-(\d+\.\d+\.\d+)\.exe$/i.exec(base);
  if (win) {
    return {
      version: win[1],
      tag: `v${win[1]}`,
      platform: "windows",
      unsigned: false,
      fileName: base,
    };
  }

  return null;
}

export function formatInstallerLabel(
  info: DesktopInstallerInfo | null,
  fallbackFileName?: string | null,
): string {
  if (info) {
    const unsigned = info.unsigned ? " (unsigned)" : "";
    return `${info.tag}${unsigned}`;
  }
  if (fallbackFileName) return fallbackFileName;
  return "—";
}
