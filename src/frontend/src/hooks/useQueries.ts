import type {
  EmailAutomationSettings,
  EmailLog,
  EmailSendResult,
  LicenseRecord,
  LicenseRequest,
  PremiumPurchase,
  Product,
  ResendConfiguration,
  ShoppingItem,
  StripeConfiguration,
  UserSubmission,
  LicenseBundle as _LicenseBundle,
  LicenseFeature as _LicenseFeature,
} from "@/backend";
import { ExternalBlob } from "@/backend";

// Extend LicenseFeature with optional featureType for Features Management
export type LicenseFeature = _LicenseFeature & { featureType?: string };
export type LicenseBundle = _LicenseBundle;
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// User submissions
export function useSubmitUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.submitUser(name, email);
      return result;
    },
    onSuccess: (result) => {
      if (result.__kind__ === "newUser") {
        queryClient.invalidateQueries({ queryKey: ["userSubmissions"] });
        queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      }
      // alreadySubmitted: no cache invalidation needed — no new data was written
    },
  });
}

export function useIncrementDownloadCount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.incrementDownloadCount(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSubmissions"] });
    },
  });
}

export function useGetUserSubmissions() {
  const { actor, isFetching } = useActor();

  return useQuery<UserSubmission[]>({
    queryKey: ["userSubmissions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserSubmissions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteUserSubmission() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteUserSubmission(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSubmissions"] });
    },
  });
}

// Products
export function useGetProducts() {
  const { actor, isFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Premium purchases
export function useGetPremiumPurchases() {
  const { actor, isFetching } = useActor();

  return useQuery<PremiumPurchase[]>({
    queryKey: ["premiumPurchases"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPremiumPurchases();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEntitlementRegistry() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["entitlementRegistry"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getEntitlementRegistry();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetInstallerFileNames() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["installerFileNames"],
    queryFn: async () => {
      if (!actor) return { macFileName: null, windowsFileName: null };
      return actor.getInstallerFileNames();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBackfillEntitlementsFromPurchases() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.backfillEntitlementsFromPurchases();
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlementRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["premiumPurchases"] });
    },
  });
}

export function useResetEntitlementActivation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entitlementId: string) => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        resetEntitlementActivation: (
          id: string,
        ) => Promise<
          | { __kind__: "ok"; ok: unknown }
          | { __kind__: "err"; err: string }
          | { ok?: unknown; err?: string }
        >;
      };
      const result = await extActor.resetEntitlementActivation(entitlementId);
      if (
        result &&
        typeof result === "object" &&
        "__kind__" in result &&
        result.__kind__ === "err"
      ) {
        throw new Error(result.err);
      }
      if (
        result &&
        typeof result === "object" &&
        "err" in result &&
        result.err
      ) {
        throw new Error(String(result.err));
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlementRegistry"] });
    },
  });
}

export function useUpdatePurchase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      features,
    }: { transactionId: string; features: string[] }) => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        updatePurchaseFeatures: (
          transactionId: string,
          features: string[],
        ) => Promise<
          { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
        >;
      };
      const result = await extActor.updatePurchaseFeatures(
        transactionId,
        features,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premiumPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
    },
  });
}

export function useResendLicense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      email,
    }: { transactionId: string; email: string }) => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        resendPurchaseLicense: (
          transactionId: string,
          email: string,
        ) => Promise<
          { __kind__: "ok"; value: string } | { __kind__: "err"; value: string }
        >;
      };
      const result = await extActor.resendPurchaseLicense(transactionId, email);
      if (result.__kind__ === "err") throw new Error(result.value);
      return result.value;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
    },
  });
}

export function useFulfillPaidLicense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.fulfillPaidLicense(sessionId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premiumPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      queryClient.invalidateQueries({ queryKey: ["entitlementRegistry"] });
    },
  });
}

/** @deprecated Use useFulfillPaidLicense — client-side signing removed (SEC-001). */
export function useGeneratePaidLicense() {
  return useFulfillPaidLicense();
}

// Email logs
export function useGetEmailLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<EmailLog[]>({
    queryKey: ["emailLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getEmailLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteEmailLog() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logKey: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteEmailLog(logKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
    },
  });
}

export function useBulkDeleteEmailLogs() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logKeys: string[]) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteEmailLogs(logKeys);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
    },
  });
}
// Transaction logs (consolidated per-transaction records)
export interface PipelineStep {
  step: string;
  message: string;
  timestamp: bigint;
}

export interface TransactionLog {
  id: string;
  recipientEmail: string;
  customerName: string;
  transactionId: string;
  features: string[];
  amountPaid: string;
  licenseStatus: string;
  createdAt: bigint;
  updatedAt: bigint;
  pipelineSteps: PipelineStep[];
}

export function useGetTransactionLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<TransactionLog[]>({
    queryKey: ["transactionLogs"],
    queryFn: async () => {
      if (!actor) return [];
      const extActor = actor as unknown as {
        getTransactionLogs: () => Promise<TransactionLog[]>;
      };
      return extActor.getTransactionLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteTransactionLog() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        deleteTransactionLog: (id: string) => Promise<boolean>;
      };
      return extActor.deleteTransactionLog(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactionLogs"] });
    },
  });
}

export function useBulkDeleteTransactionLogs() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        deleteTransactionLogs: (ids: string[]) => Promise<bigint>;
      };
      return extActor.deleteTransactionLogs(ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactionLogs"] });
    },
  });
}

// Email automation settings
export function useGetEmailAutomationSettings() {
  const { actor, isFetching } = useActor();

  return useQuery<EmailAutomationSettings>({
    queryKey: ["emailAutomationSettings"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getEmailAutomationSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateEmailAutomationSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: EmailAutomationSettings) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateEmailAutomationSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailAutomationSettings"] });
    },
  });
}

// RESEND configuration
export function useGetResendConfiguration() {
  const { actor, isFetching } = useActor();

  return useQuery<ResendConfiguration | null>({
    queryKey: ["resendConfiguration"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getResendConfiguration();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetResendConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: ResendConfiguration) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setResendConfiguration(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resendConfiguration"] });
      queryClient.invalidateQueries({ queryKey: ["configurationStatus"] });
    },
  });
}

export function useUpdateResendServiceName() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceName: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateResendServiceName(serviceName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resendConfiguration"] });
    },
  });
}

export function useTestResendConnection() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (): Promise<EmailSendResult> => {
      if (!actor) throw new Error("Actor not available");
      return actor.testResendConnection();
    },
  });
}

// Trial license file
export function useGetTrialLicenseFile() {
  const { actor, isFetching } = useActor();

  return useQuery<ExternalBlob | null>({
    queryKey: ["trialLicenseFile"],
    queryFn: async () => {
      if (!actor) return null;
      const bytes = await actor.getTrialLicenseFile();
      return bytes ? ExternalBlob.fromBytes(bytes) : null;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadTrialLicenseFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: ExternalBlob) => {
      if (!actor) throw new Error("Actor not available");
      return actor.uploadTrialLicenseFile(await file.getBytes());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trialLicenseFile"] });
    },
  });
}

// Installer files
export function useGetMacInstaller() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    file: ExternalBlob;
    fileName: string;
    mimeType: string;
  } | null>({
    queryKey: ["macInstaller"],
    queryFn: async () => {
      if (!actor) return null;
      const meta = await actor.getMacInstallerMeta();
      if (!meta) return null;
      return {
        file: ExternalBlob.fromBytes(new Uint8Array()),
        fileName: meta.fileName,
        mimeType: meta.mimeType,
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadMacInstaller() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const { uploadInstallerChunked } = await import("@/lib/chunkedInstaller");
      await uploadInstallerChunked(actor, "mac", file, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["macInstaller"] });
      queryClient.invalidateQueries({ queryKey: ["installerFileNames"] });
    },
  });
}

export function useGetWindowsInstaller() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    file: ExternalBlob;
    fileName: string;
    mimeType: string;
  } | null>({
    queryKey: ["windowsInstaller"],
    queryFn: async () => {
      if (!actor) return null;
      const meta = await actor.getWindowsInstallerMeta();
      if (!meta) return null;
      return {
        file: ExternalBlob.fromBytes(new Uint8Array()),
        fileName: meta.fileName,
        mimeType: meta.mimeType,
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadWindowsInstaller() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const { uploadInstallerChunked } = await import("@/lib/chunkedInstaller");
      await uploadInstallerChunked(actor, "windows", file, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["windowsInstaller"] });
      queryClient.invalidateQueries({ queryKey: ["installerFileNames"] });
    },
  });
}

// Public installer downloads (no authentication required)
export function useDownloadMacInstaller() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (onProgress?: (percent: number) => void) => {
      if (!actor) throw new Error("Actor not available");
      const { downloadInstallerChunked } = await import("@/lib/chunkedInstaller");
      return downloadInstallerChunked(actor, "mac", onProgress);
    },
  });
}

export function useDownloadWindowsInstaller() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (onProgress?: (percent: number) => void) => {
      if (!actor) throw new Error("Actor not available");
      const { downloadInstallerChunked } = await import("@/lib/chunkedInstaller");
      return downloadInstallerChunked(actor, "windows", onProgress);
    },
  });
}

// License features - fetches all license features from Features Management tab
// DDR-039: list payloads omit image blobs once Motoko strip ships; do not treat
// query failure as empty (that falsely triggers re-init UI).
export function useGetLicenseFeatures() {
  const { actor, isFetching } = useActor();

  return useQuery<LicenseFeature[]>({
    queryKey: ["licenseFeatures"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getLicenseFeatures();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/** On-demand feature marketing image (DDR-039). */
export function useFeatureImage(
  featureId: string | undefined,
  embedded?: Uint8Array,
) {
  const { actor, isFetching } = useActor();

  return useQuery<Uint8Array | null>({
    queryKey: ["featureImage", featureId],
    queryFn: async () => {
      if (embedded && embedded.byteLength > 0) return embedded;
      if (!actor || !featureId) return null;
      try {
        return await actor.getFeatureImage(featureId);
      } catch {
        // Method missing until backend upgrade, or no image stored.
        return embedded && embedded.byteLength > 0 ? embedded : null;
      }
    },
    enabled: !!featureId && ((!isFetching && !!actor) || !!(embedded && embedded.byteLength > 0)),
    staleTime: 60_000,
  });
}

// Premium features - fetches only active premium features directly from backend getPremiumFeatures()
export function useGetPremiumFeatures() {
  const { actor, isFetching } = useActor();

  return useQuery<LicenseFeature[]>({
    queryKey: ["premiumFeatures"],
    queryFn: async () => {
      if (!actor) return [];
      // Directly call backend getPremiumFeatures() which returns only active premium features
      const features = await actor.getPremiumFeatures();
      return features;
    },
    enabled: !!actor && !isFetching,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: "always", // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

// Core/free features — homepage Learn More marketing images (isPremium=false)
export function useGetCoreFeatures() {
  const { actor, isFetching } = useActor();

  return useQuery<LicenseFeature[]>({
    queryKey: ["coreFeatures"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCoreFeatures();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

// Trial-eligible feature names — authoritative list for 30-day free trial license
// Returns feature names already filtered by backend (excludes Tx Simulator and Trades)
export function useGetTrialEligibleFeatures() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ["trialEligibleFeatures"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTrialEligibleProductNames();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAddLicenseFeature() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: LicenseFeature) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addLicenseFeature(feature);
    },
    onSuccess: () => {
      // Invalidate both queries to ensure license generation panel updates
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["coreFeatures"] });
    },
  });
}

export function useUpdateLicenseFeature() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: LicenseFeature) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateLicenseFeature(feature);
    },
    onSuccess: () => {
      // Invalidate both queries to ensure license generation panel updates
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
    },
  });
}

export function useDeleteLicenseFeature() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteLicenseFeature(featureId);
    },
    onSuccess: () => {
      // Invalidate both queries to ensure license generation panel updates
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
    },
  });
}

export function useUpdateFeatureStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      featureId,
      isActive,
    }: { featureId: string; isActive: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateFeatureStatus(featureId, isActive);
    },
    onSuccess: () => {
      // Invalidate both queries to ensure license generation panel updates
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
    },
  });
}

const DEFAULT_PREMIUM_FEATURES: LicenseFeature[] = [
  {
    id: "paycheck_budget",
    name: "Paycheck Budget",
    description: "Advanced paycheck budgeting tools for financial planning.",
    isPremium: true,
    isActive: true,
    priceInCents: 1999n,
    featureType: "Premium",
    licenseReferenceName: "Paycheck Budget",
  },
  {
    id: "goals",
    name: "Goals",
    description: "Set and track financial goals with progress monitoring.",
    isPremium: true,
    isActive: true,
    priceInCents: 1499n,
    featureType: "Premium",
    licenseReferenceName: "Goals",
  },
  {
    id: "tx_simulator",
    name: "Tx Simulator",
    description:
      "Estimate tax scenarios for planning—not filing advice. Consult a qualified professional before acting.",
    isPremium: true,
    isActive: true,
    priceInCents: 1299n,
    featureType: "Premium",
    licenseReferenceName: "Tx Simulator",
  },
  {
    id: "migration-management",
    name: "Database Management",
    description: "Export, backup, and maintain your local financial data.",
    isPremium: true,
    isActive: true,
    priceInCents: 2499n,
    featureType: "Premium",
    licenseReferenceName: "Database Management",
  },
  {
    id: "trades",
    name: "Trades",
    description:
      "Scan, backtest, and trade with risk controls you define. Strategy tools only—not investment advice.",
    isPremium: true,
    isActive: true,
    priceInCents: 4999n,
    featureType: "Premium",
    licenseReferenceName: "Trades",
  },
];

/** Homepage Learn More categories — seeded via addLicenseFeature when Motoko helper is absent (DDR-038). */
const DEFAULT_CORE_FEATURES: LicenseFeature[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description:
      "Your financial command center. See income, expenses, and balances in one view.",
    isPremium: false,
    isActive: true,
    priceInCents: 0n,
    featureType: "Core",
    licenseReferenceName: "",
  },
  {
    id: "bill_files",
    name: "Bill Files",
    description:
      "Organize, track, and manage bills with due dates and payment status.",
    isPremium: false,
    isActive: true,
    priceInCents: 0n,
    featureType: "Core",
    licenseReferenceName: "",
  },
  {
    id: "income_tracking",
    name: "Income and Bill Tracking",
    description:
      "Track income sources and spending so you always know what is left after bills.",
    isPremium: false,
    isActive: true,
    priceInCents: 0n,
    featureType: "Core",
    licenseReferenceName: "",
  },
];

function isMissingCanisterMethodError(error: unknown, method: string): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("IC0536") ||
    msg.includes("no update method") ||
    msg.includes(`'${method}'`) ||
    msg.includes(method)
  );
}

/** Ids used for DDR-039 list-recovery (remove oversized images without a list query). */
export const KNOWN_FEATURE_IMAGE_IDS = [
  ...DEFAULT_PREMIUM_FEATURES.map((f) => f.id),
  ...DEFAULT_CORE_FEATURES.map((f) => f.id),
] as const;

export function useInitializeDefaultPremiumFeatures() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");

      // Always idempotent client seed. Never call Motoko initializeDefaultPremiumFeatures
      // on older wasm that overwrote rows with image=null (DDR-039).
      let existing: LicenseFeature[];
      try {
        existing = await actor.getLicenseFeatures();
      } catch {
        throw new Error(
          "Feature list query failed (likely oversized images). Use Recover list before Initialize.",
        );
      }
      const existingIds = new Set(existing.map((f) => f.id));
      let created = 0;
      for (const feature of DEFAULT_PREMIUM_FEATURES) {
        if (existingIds.has(feature.id)) continue;
        await actor.addLicenseFeature(feature);
        created += 1;
      }
      return { mode: "client" as const, created };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
    },
  });
}

export function useInitializeDefaultCoreFeatures() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");

      // Prefer Motoko helper when the backend has been upgraded.
      try {
        await actor.initializeDefaultCoreFeatures();
        return { mode: "canister" as const, created: DEFAULT_CORE_FEATURES.length };
      } catch (error) {
        if (!isMissingCanisterMethodError(error, "initializeDefaultCoreFeatures")) {
          throw error;
        }
      }

      // Live backend may lack the helper until Motoko upgrade succeeds (DDR-038).
      // Seed with the existing addLicenseFeature API (idempotent: skip known ids).
      let existing: LicenseFeature[];
      try {
        existing = await actor.getLicenseFeatures();
      } catch {
        throw new Error(
          "Feature list query failed (likely oversized images). Use Recover list before Initialize.",
        );
      }
      const existingIds = new Set(existing.map((f) => f.id));
      let created = 0;
      for (const feature of DEFAULT_CORE_FEATURES) {
        if (existingIds.has(feature.id)) continue;
        await actor.addLicenseFeature(feature);
        created += 1;
      }
      return { mode: "client" as const, created };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["coreFeatures"] });
    },
  });
}

export function useGetLicenseBundles() {
  const { actor, isFetching } = useActor();

  return useQuery<LicenseBundle[]>({
    queryKey: ["licenseBundles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLicenseBundles();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useGetAllLicenseBundles() {
  const { actor, isFetching } = useActor();

  return useQuery<LicenseBundle[]>({
    queryKey: ["allLicenseBundles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllLicenseBundles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddLicenseBundle() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundle: LicenseBundle) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addLicenseBundle(bundle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseBundles"] });
      queryClient.invalidateQueries({ queryKey: ["allLicenseBundles"] });
    },
  });
}

export function useUpdateLicenseBundle() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundle: LicenseBundle) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateLicenseBundle(bundle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseBundles"] });
      queryClient.invalidateQueries({ queryKey: ["allLicenseBundles"] });
    },
  });
}

export function useDeleteLicenseBundle() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundleId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteLicenseBundle(bundleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseBundles"] });
      queryClient.invalidateQueries({ queryKey: ["allLicenseBundles"] });
    },
  });
}

export function useUpdateBundleStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bundleId,
      isActive,
    }: { bundleId: string; isActive: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateBundleStatus(bundleId, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseBundles"] });
      queryClient.invalidateQueries({ queryKey: ["allLicenseBundles"] });
    },
  });
}

export function useInitializeDefaultLicenseBundles() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.initializeDefaultLicenseBundles();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseBundles"] });
      queryClient.invalidateQueries({ queryKey: ["allLicenseBundles"] });
    },
  });
}

// Feature image management
export function useUploadFeatureImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      featureId,
      image,
    }: { featureId: string; image: ExternalBlob }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.uploadFeatureImage(featureId, await image.getBytes());
    },
    onSuccess: (_data, { featureId }) => {
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["coreFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["featureImage", featureId] });
    },
  });
}

export function useRemoveFeatureImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeFeatureImage(featureId);
    },
    onSuccess: (_data, featureId) => {
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["coreFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["featureImage", featureId] });
    },
  });
}

/**
 * DDR-039 recovery: strip known feature images so getLicenseFeatures fits under
 * the IC ~3 MiB query limit. Does not delete feature rows.
 */
export function useRecoverFeatureListImages() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      let removed = 0;
      for (const featureId of KNOWN_FEATURE_IMAGE_IDS) {
        try {
          await actor.removeFeatureImage(featureId);
          removed += 1;
        } catch {
          // Feature missing or no image — ignore
        }
      }
      return { removed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["premiumFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["coreFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["featureImage"] });
    },
  });
}

// License records
export function useGetLicenseRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<LicenseRecord[]>({
    queryKey: ["licenseRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLicenseRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteLicenseRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (licenseId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteLicenseRecord(licenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
    },
  });
}

export function useBulkDeleteLicenseRecords() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (licenseIds: string[]) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteLicenseRecords(licenseIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
    },
  });
}
export function useDeletePremiumPurchase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deletePremiumPurchase(transactionId);
      if ("err" in result) throw new Error(String(result.err));
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premiumPurchases"] });
    },
  });
}

export function useBulkDeletePremiumPurchases() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deletePremiumPurchases(transactionIds);
      if ("err" in result) throw new Error(String(result.err));
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premiumPurchases"] });
    },
  });
}

// Private key — PEM uploaded to canister for server-side signing only (SEC-001).
export function useUploadPrivateKeyPem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pem: string) => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        uploadPrivateKeyPem: (pem: string) => Promise<void>;
      };
      return extActor.uploadPrivateKeyPem(pem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configurationStatus"] });
    },
  });
}

/** @deprecated Use useUploadPrivateKeyPem */
export function useUploadPrivateKeyFile() {
  return useUploadPrivateKeyPem();
}

export function useIssueTrialLicenseAndEmail() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["issueTrialLicense"],
    mutationFn: async ({
      name,
      email,
    }: {
      name: string;
      email: string;
    }): Promise<string> => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        issueTrialLicenseAndEmail: (
          name: string,
          email: string,
        ) => Promise<
          { __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }
        >;
      };
      const result = await extActor.issueTrialLicenseAndEmail(name, email);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
    },
  });
}

/** @deprecated Use useIssueTrialLicenseAndEmail */
export function useSendTrialLicenseEmailMutation() {
  const issueTrial = useIssueTrialLicenseAndEmail();
  return {
    ...issueTrial,
    mutateAsync: async ({
      name,
      email,
    }: {
      name: string;
      email: string;
      signedLicenseJson?: string;
    }) => issueTrial.mutateAsync({ name, email }),
  };
}

// License generation
export function useGenerateLicense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: LicenseRequest) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateLicense(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      queryClient.invalidateQueries({ queryKey: ["entitlementRegistry"] });
    },
  });
}

// Manual license sending
export function useSendManualLicense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientName,
      recipientEmail,
      selectedFeatures,
    }: {
      recipientName: string;
      recipientEmail: string;
      selectedFeatures: string[];
    }): Promise<EmailSendResult> => {
      if (!actor) throw new Error("Actor not available");
      return actor.sendManualLicense(
        recipientName,
        recipientEmail,
        selectedFeatures,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenseRecords"] });
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      queryClient.invalidateQueries({ queryKey: ["entitlementRegistry"] });
    },
  });
}

// Stripe
export function useIsStripeConfigured() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["stripeConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetStripeConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: StripeConfiguration) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setStripeConfiguration(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripeConfigured"] });
      queryClient.invalidateQueries({ queryKey: ["configurationStatus"] });
    },
  });
}

export function useCreateCheckoutSession() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (items: ShoppingItem[]) => {
      if (!actor) throw new Error("Actor not available");
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-failure`;
      return actor.createCheckoutSession(items, successUrl, cancelUrl);
    },
  });
}

// Admin
export function useIsAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isAdminByRole"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isAdminByRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetLicenseReferenceNames() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["licenseReferenceNames"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLicenseReferenceNames();
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 60,
  });
}

export function useGetConfigurationStatus() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["configurationStatus"],
    queryFn: async () => {
      if (!actor)
        return {
          stripeConfigured: false,
          resendConfigured: false,
          privateKeyPresent: false,
        };
      return actor.getConfigurationStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}
// Check for any pending admin invite (for authenticated but not-yet-active admins)
export function useCheckAnyPendingInvite() {
  const { actor, isFetching } = useActor();
  const { isAuthenticated } = useInternetIdentity();

  return useQuery<{
    email: [string] | [];
    role: string;
    hasUnlinked: boolean;
  } | null>({
    queryKey: ["pendingInvite"],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.checkAnyPendingInvite();
      // Backend returns opt record; unwrap it
      if (result === null || result === undefined) return null;
      // The result may be an array [record] or the record itself depending on bindgen
      const record = Array.isArray(result) ? result[0] : result;
      if (!record) return null;
      return {
        email: record.email ?? [],
        role: record.role ?? "",
        hasUnlinked: record.hasUnlinked ?? false,
      };
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// RBAC Admin hooks
export function useGetMyAdminRole() {
  const { actor, isFetching } = useActor();
  return useQuery<string | null>({
    queryKey: ["myAdminRole"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyAdminRole();
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 5,
  });
}

export function useListAdmins() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["adminList"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAdmins();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMutationInviteAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      email,
      role,
    }: { name: string; email: string; role: string }) => {
      if (!actor) throw new Error("Actor not available");
      const adminRole = role as Parameters<typeof actor.inviteAdmin>[2];
      const result = await actor.inviteAdmin(name, email, adminRole);
      if (result.__kind__ === "ok") {
        return { success: true, message: result.ok };
      }
      return { success: false, message: result.err };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["adminList"] });
      }
    },
  });
}

export function useMutationClaimAdminInvite() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      email,
      tempPassword,
    }: { email: string; tempPassword: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.claimAdminInvite(email, tempPassword);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
  });
}

export function useMutationUpdateAdminRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!actor) throw new Error("Actor not available");
      const adminRole = role as Parameters<typeof actor.updateAdminRole>[1];
      const result = await actor.updateAdminRole(email, adminRole);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
      queryClient.invalidateQueries({ queryKey: ["myAdminRole"] });
    },
  });
}

export function useMutationElevateAdminRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      adminId,
      newRole,
    }: { adminId: string; newRole: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (
        actor as unknown as {
          elevateAdminRole: (
            adminId: string,
            newRole: string,
          ) => Promise<{ ok: string } | { err: string }>;
        }
      ).elevateAdminRole(adminId, newRole);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
      queryClient.invalidateQueries({ queryKey: ["auditLog"] });
    },
  });
}

export function useMutationClaimRoleElevation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tempPassword: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (
        actor as unknown as {
          claimRoleElevation: (
            tempPassword: string,
          ) => Promise<{ ok: string } | { err: string }>;
        }
      ).claimRoleElevation(tempPassword);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
      queryClient.invalidateQueries({ queryKey: ["myAdminRole"] });
    },
  });
}

export function useMutationDeactivateAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deactivateAdmin(email);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
    },
  });
}

export function useMutationReactivateAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.reactivateAdmin(email);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
    },
  });
}

export function useMutationDeleteAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deleteAdmin(email);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
    },
  });
}

export function useGetAuditLog(limit: number) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["auditLog", limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAuditLog(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMutationBootstrapSuperAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.bootstrapSuperAdmin(name, email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
      queryClient.invalidateQueries({ queryKey: ["myAdminRole"] });
    },
  });
}

export function useMutationAssignSuperAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.assignSuperAdmin(email);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
      queryClient.invalidateQueries({ queryKey: ["myAdminRole"] });
    },
  });
}
export function useGetSuperAdminClaimCode() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["superAdminClaimCode"],
    queryFn: async () => {
      if (!actor) return "";
      return actor.getSuperAdminClaimCode();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMutationClaimSuperAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      code,
      name,
      email,
    }: {
      code: string;
      name: string;
      email: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.claimSuperAdmin(code, name, email);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superAdminClaimCode"] });
      queryClient.invalidateQueries({ queryKey: ["adminList"] });
      queryClient.invalidateQueries({ queryKey: ["myAdminRole"] });
    },
  });
}

export function useMutationRegenerateSuperAdminClaimCode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const extActor = actor as unknown as {
        regenerateSuperAdminClaimCode: () => Promise<
          { ok: string } | { err: string }
        >;
      };
      const result = await extActor.regenerateSuperAdminClaimCode();
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superAdminClaimCode"] });
    },
  });
}
