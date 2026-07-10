import type { LicenseBundle } from "@/backend";
import bundlesDoc from "../../../../contracts/canister-bundles.snapshot.json";
import type { LicenseFeature } from "../hooks/useQueries";

export interface BundleSnapshotRow {
  bundleId: string;
  name: string;
  priceInCentsAnnual: number;
  featureIds: string[];
  licenseReferenceNames: string[];
  alaCarteSumCents: number;
  savingsCents: number;
  isActive: boolean;
}

export interface BundleDisplayRow extends BundleSnapshotRow {
  headline: string;
  bullets: string[];
  badge: string;
  saveTextOverride: string;
  disclaimer: string;
  sortOrder: number;
}

/** Contracts bundle ids that differ from IC canister license feature ids. */
export const CONTRACT_FEATURE_ID_ALIASES: Record<string, string> = {
  database_management: "migration-management",
};

export const BUNDLE_CATALOG: BundleSnapshotRow[] = (
  bundlesDoc.bundles ?? []
).filter((row) => row.isActive !== false);

export function formatAnnualPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatAnnualPricePerYear(cents: number): string {
  return `${formatAnnualPrice(cents)}/yr`;
}

export function formatSavings(cents: number): string {
  return `Save ${formatAnnualPrice(cents)}`;
}

function featureLookupMaps(features: LicenseFeature[]) {
  const byId = new Map(features.map((f) => [f.id, f]));
  const byLicenseRef = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const feature of features) {
    if (feature.licenseReferenceName) {
      byLicenseRef.set(feature.licenseReferenceName.toLowerCase(), feature.id);
    }
    if (feature.name) {
      byName.set(feature.name.toLowerCase(), feature.id);
    }
  }
  return { byId, byLicenseRef, byName };
}

/** Map contract / legacy ids and license display names to canonical canister feature ids. */
export function normalizeBundleFeatureIds(
  featureIds: string[],
  features: LicenseFeature[],
): string[] {
  if (features.length === 0) return [];

  const { byId, byLicenseRef, byName } = featureLookupMaps(features);
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of featureIds) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const aliased = CONTRACT_FEATURE_ID_ALIASES[trimmed] ?? trimmed;
    let id: string | undefined;

    if (byId.has(aliased)) {
      id = aliased;
    } else if (byId.has(trimmed)) {
      id = trimmed;
    } else {
      const lower = trimmed.toLowerCase();
      id = byLicenseRef.get(lower) ?? byName.get(lower);
    }

    if (id && byId.has(id) && !seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  }

  return normalized;
}

/** Canonical RSA license reference names for storefront, checkout, and order summary. */
export function resolveLicenseReferenceNames(
  featureIds: string[],
  features: LicenseFeature[],
): string[] {
  const normalizedIds = normalizeBundleFeatureIds(featureIds, features);
  const seen = new Set<string>();
  const names: string[] = [];

  for (const fid of normalizedIds) {
    const feature = features.find((f) => f.id === fid);
    const name = feature?.licenseReferenceName?.trim() || feature?.name?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}

export function toBundleDisplayRow(
  bundle: LicenseBundle,
  features: LicenseFeature[],
): BundleDisplayRow {
  const featureIds = normalizeBundleFeatureIds(bundle.featureIds, features);
  const licenseReferenceNames = resolveLicenseReferenceNames(
    featureIds,
    features,
  );
  return {
    bundleId: bundle.bundleId,
    name: bundle.name,
    priceInCentsAnnual: Number(bundle.priceInCentsAnnual),
    featureIds,
    licenseReferenceNames,
    alaCarteSumCents: Number(bundle.alaCarteSumCents),
    savingsCents: Number(bundle.savingsCents),
    headline: bundle.headline,
    bullets: bundle.bullets,
    badge: bundle.badge,
    saveTextOverride: bundle.saveTextOverride,
    disclaimer: bundle.disclaimer,
    isActive: bundle.isActive,
    sortOrder: Number(bundle.sortOrder),
  };
}

export function snapshotToDisplayRow(
  row: BundleSnapshotRow,
  features: LicenseFeature[] = [],
): BundleDisplayRow {
  const featureIds =
    features.length > 0
      ? normalizeBundleFeatureIds(row.featureIds, features)
      : row.featureIds;
  const licenseReferenceNames =
    features.length > 0
      ? resolveLicenseReferenceNames(featureIds, features)
      : row.licenseReferenceNames;
  return {
    ...row,
    featureIds,
    licenseReferenceNames,
    headline: "",
    bullets: [],
    badge: "",
    saveTextOverride: "",
    disclaimer: "",
    sortOrder: 0,
  };
}

export function bundleIncludesRegulatedFeatures(
  bundle: Pick<BundleSnapshotRow, "licenseReferenceNames">,
): boolean {
  return bundle.licenseReferenceNames.some(
    (name) => name === "Trades" || name === "Tx Simulator",
  );
}

export function bundleSaveText(bundle: BundleDisplayRow): string {
  if (bundle.saveTextOverride.trim()) {
    return bundle.saveTextOverride.trim();
  }
  if (bundle.savingsCents > 0) {
    return `${formatSavings(bundle.savingsCents)} vs à la carte`;
  }
  return "";
}

export function prepareBundleForSave(
  bundle: LicenseBundle,
  features: LicenseFeature[],
): LicenseBundle {
  return {
    ...bundle,
    featureIds: normalizeBundleFeatureIds(bundle.featureIds, features),
  };
}
