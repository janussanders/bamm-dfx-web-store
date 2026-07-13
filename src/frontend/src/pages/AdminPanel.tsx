import { ExternalBlob } from "@/backend";
import type {
  LicenseFeature,
  PremiumPurchase,
  ResendConfiguration,
} from "@/backend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useBulkDeleteEmailLogs,
  useBulkDeletePremiumPurchases,
  useCheckAnyPendingInvite,
  useDeletePremiumPurchase,
  useGetAuditLog,
  useGetMyAdminRole,
  useGetSuperAdminClaimCode,
  useListAdmins,
  useMutationAssignSuperAdmin,
  useMutationBootstrapSuperAdmin,
  useMutationDeactivateAdmin,
  useMutationDeleteAdmin,
  useMutationElevateAdminRole,
  useMutationInviteAdmin,
  useMutationReactivateAdmin,
  useMutationUpdateAdminRole,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  STOREFRONT_COMMIT,
  STOREFRONT_VERSION,
  formatInstallerLabel,
  parseDesktopInstallerFileName,
} from "@/lib/versions";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Edit2,
  Eye,
  FileText,
  Image as ImageIcon,
  Key,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  ToggleLeft,
  Trash2,
  Upload,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import BundleManagementPanel from "../components/BundleManagementPanel";
import EntitlementRegistryPanel from "../components/EntitlementRegistryPanel";
import LicenseGenerationPanel from "../components/LicenseGenerationPanel";
import TransactionModal from "../components/TransactionModal";
import type { TransactionLog } from "../components/TransactionModal";
import {
  useAddLicenseFeature,
  useBulkDeleteTransactionLogs,
  useDeleteEmailLog,
  useDeleteLicenseFeature,
  useDeleteLicenseRecord,
  useDeleteTransactionLog,
  useDeleteUserSubmission,
  useGetConfigurationStatus,
  useGetEmailAutomationSettings,
  useGetEmailLogs,
  useGetLicenseFeatures,
  useGetLicenseRecords,
  useGetMacInstaller,
  useGetPremiumPurchases,
  useGetResendConfiguration,
  useGetTransactionLogs,
  useGetTrialLicenseFile,
  useGetUserSubmissions,
  useGetWindowsInstaller,
  useInitializeDefaultCoreFeatures,
  useInitializeDefaultPremiumFeatures,
  useIsAdmin,
  useIsStripeConfigured,
  useMutationRegenerateSuperAdminClaimCode,
  useRemoveFeatureImage,
  useResendLicense,
  useSetResendConfiguration,
  useSetStripeConfiguration,
  useTestResendConnection,
  useUpdateEmailAutomationSettings,
  useUpdateFeatureStatus,
  useUpdateLicenseFeature,
  useUpdateProduct,
  useUpdatePurchase,
  useUpdateResendServiceName,
  useUploadFeatureImage,
  useUploadMacInstaller,
  useUploadTrialLicenseFile,
  useUploadWindowsInstaller,
} from "../hooks/useQueries";

// Role helper: converts backend AdminRole string to display string
function roleToString(role: string | null | undefined): string {
  if (!role) return "Unknown";
  // Backend returns string enum values directly from getMyAdminRole
  const map: Record<string, string> = {
    superAdmin: "Super Admin",
    administrator: "Administrator",
    featuresManager: "Features Manager",
    licenseGenerator: "License Generator",
  };
  return map[role] ?? role;
}

function ClaimCodeSection({ claimCode }: { claimCode?: string }) {
  const [copied, setCopied] = useState(false);
  const [regenSuccess, setRegenSuccess] = useState(false);
  const regenerate = useMutationRegenerateSuperAdminClaimCode();

  const copy = () => {
    if (claimCode && claimCode !== "ALREADY_CLAIMED") {
      navigator.clipboard.writeText(claimCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => {
        setRegenSuccess(true);
        toast.success("New claim code generated successfully");
        setTimeout(() => setRegenSuccess(false), 4000);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate new code",
        );
      },
    });
  };

  if (!claimCode) return null;

  const isClaimed = claimCode === "ALREADY_CLAIMED";

  return (
    <div className="p-4 bg-amber-950 border border-amber-700 rounded-lg mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-amber-400 font-semibold text-sm">
          ⚠ One-Time Super Admin Claim Code
        </span>
      </div>
      {isClaimed ? (
        <>
          <p className="text-amber-300 text-xs mb-3">
            This code has already been used. Generate a new one to allow another
            Super Admin to claim access.
          </p>
          {regenSuccess && (
            <p className="text-green-400 text-xs mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              New code generated — copy it above before navigating away.
            </p>
          )}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerate.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
          >
            {regenerate.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Generate New Code
          </button>
        </>
      ) : (
        <>
          <p className="text-amber-200 text-xs mb-3">
            Share this code securely with the person who needs Super Admin
            access. Valid for one use only.
          </p>
          {regenSuccess && (
            <p className="text-green-400 text-xs mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              New code generated successfully.
            </p>
          )}
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 bg-black text-amber-300 font-mono text-sm px-3 py-2 rounded border border-amber-800 select-all">
              {claimCode}
            </code>
            <button
              type="button"
              onClick={copy}
              className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded transition-colors shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-amber-400 text-xs">
              Direct them to /admin-claim to enter this code.
            </p>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-amber-900 hover:bg-amber-800 border border-amber-700 disabled:opacity-50 text-amber-300 text-xs rounded transition-colors"
            >
              {regenerate.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Generate New Code
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function getRoleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    superAdmin: "bg-purple-600 text-white",
    administrator: "bg-blue-600 text-white",
    featuresManager: "bg-green-600 text-white",
    licenseGenerator: "bg-amber-500 text-white",
  };
  return map[role] ?? "bg-muted text-muted-foreground";
}

function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    active: "bg-green-600 text-white",
    pending: "bg-yellow-500 text-white",
    deactivated: "bg-muted text-muted-foreground",
  };
  return map[status] ?? "";
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { isLoading: stripeLoading } = useIsStripeConfigured();
  const { data: configStatus } = useGetConfigurationStatus();
  const { data: myAdminRole, isLoading: roleLoading } = useGetMyAdminRole();
  // Normalize role: strip any leading '#' that Motoko variant encoding may add
  const normalizeRole = (r: string | null | undefined): string | null => {
    if (!r) return null;
    return r.replace(/^#/, "").trim();
  };
  // Safe fallback: if user passed isAdmin check but role hasn't loaded or returned null,
  // default to 'superAdmin' — isAdmin already means they passed backend authorization,
  // so giving full access is the correct safe default (avoids silently downgrading SAs).
  const effectiveRole: string | null =
    normalizeRole(myAdminRole) ?? (isAdmin ? "superAdmin" : null);

  // Tab visibility helpers
  const isSuperAdmin = effectiveRole === "superAdmin";
  const isAdministratorOrAbove =
    isSuperAdmin || effectiveRole === "administrator";
  const canSeeFeaturesTab =
    isSuperAdmin ||
    effectiveRole === "administrator" ||
    effectiveRole === "featuresManager";
  const canSeeLicensesTab =
    isSuperAdmin ||
    effectiveRole === "administrator" ||
    effectiveRole === "featuresManager" ||
    effectiveRole === "licenseGenerator";

  // RBAC state
  const { data: adminList, isLoading: isLoadingAdmins } = useListAdmins();
  const inviteAdmin = useMutationInviteAdmin();
  const [inviteEmailStatus, setInviteEmailStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const updateAdminRole = useMutationUpdateAdminRole();
  const deactivateAdmin = useMutationDeactivateAdmin();
  const reactivateAdmin = useMutationReactivateAdmin();
  const deleteAdmin = useMutationDeleteAdmin();
  const bootstrapSuperAdmin = useMutationBootstrapSuperAdmin();
  const _assignSuperAdmin = useMutationAssignSuperAdmin();
  const { data: auditLog } = useGetAuditLog(100);
  const { data: claimCodeData } = useGetSuperAdminClaimCode();

  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "",
  });
  const [editingAdminEmail, setEditingAdminEmail] = useState<string | null>(
    null,
  );
  const [editingAdminRole, setEditingAdminRole] = useState("");
  const [deleteAdminEmail, setDeleteAdminEmail] = useState<string | null>(null);
  const [showElevateDialog, setShowElevateDialog] = useState(false);
  const [elevatingAdmin, setElevatingAdmin] = useState<{
    id: string;
    email: string;
    name?: string;
    role: string;
    isProtected?: boolean;
    status: string;
  } | null>(null);
  const [elevateTargetRole, setElevateTargetRole] = useState<string>("");
  const [elevateLoading, setElevateLoading] = useState(false);
  const [elevateError, setElevateError] = useState<string>("");
  const [elevateSuccess, setElevateSuccess] = useState<string>("");
  const elevateAdminRole = useMutationElevateAdminRole();
  const [bootstrapName, setBootstrapName] = useState("");
  const [bootstrapEmail, setBootstrapEmail] = useState("");
  const setStripeConfig = useSetStripeConfiguration();
  const { data: submissions } = useGetUserSubmissions();
  const deleteUserSubmission = useDeleteUserSubmission();
  const { data: purchases } = useGetPremiumPurchases();
  const { data: emailLogs } = useGetEmailLogs();
  const deleteEmailLog = useDeleteEmailLog();
  const bulkDeleteEmailLogs = useBulkDeleteEmailLogs();
  const { data: emailSettings } = useGetEmailAutomationSettings();
  const updateEmailSettings = useUpdateEmailAutomationSettings();
  const { data: trialLicenseFile } = useGetTrialLicenseFile();
  const uploadLicenseFile = useUploadTrialLicenseFile();
  const { data: licenseRecords } = useGetLicenseRecords();
  const deleteLicenseRecord = useDeleteLicenseRecord();
  const { data: licenseFeatures } = useGetLicenseFeatures();
  const addLicenseFeature = useAddLicenseFeature();
  const updateLicenseFeature = useUpdateLicenseFeature();
  const deleteLicenseFeature = useDeleteLicenseFeature();
  const updateFeatureStatus = useUpdateFeatureStatus();
  const { data: resendConfig } = useGetResendConfiguration();
  const setResendConfig = useSetResendConfiguration();
  const testResendConnection = useTestResendConnection();
  const _updateServiceName = useUpdateResendServiceName();
  const initializeFeatures = useInitializeDefaultPremiumFeatures();
  const initializeCoreFeatures = useInitializeDefaultCoreFeatures();
  const updatePurchaseMutation = useUpdatePurchase();
  const resendLicenseMutation = useResendLicense();
  const deletePurchaseMutation = useDeletePremiumPurchase();
  const bulkDeletePurchasesMutation = useBulkDeletePremiumPurchases();
  const { data: macInstaller } = useGetMacInstaller();
  const uploadMacInstaller = useUploadMacInstaller();
  const { data: windowsInstaller } = useGetWindowsInstaller();
  const uploadWindowsInstaller = useUploadWindowsInstaller();
  const uploadFeatureImage = useUploadFeatureImage();
  const removeFeatureImage = useRemoveFeatureImage();

  const macFileInputRef = useRef<HTMLInputElement>(null);
  const windowsFileInputRef = useRef<HTMLInputElement>(null);

  const [secretKey, setSecretKey] = useState("");
  const [allowedCountries, setAllowedCountries] = useState("US,CA,GB");
  const [stripeKeyConfigured, setStripeKeyConfigured] = useState(false);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [showEditFeature, setShowEditFeature] = useState(false);
  const [showEditPurchase, setShowEditPurchase] = useState(false);
  const [editingFeature, setEditingFeature] = useState<LicenseFeature | null>(
    null,
  );
  const [editingPurchase, setEditingPurchase] =
    useState<PremiumPurchase | null>(null);
  const [editingPurchaseFeatures, setEditingPurchaseFeatures] = useState<
    string[]
  >([]);
  const [featuresInitialized, setFeaturesInitialized] = useState(false);

  // Deletion confirmation states
  const [deleteSubmissionEmail, setDeleteSubmissionEmail] = useState<
    string | null
  >(null);
  const [deleteLogKey, setDeleteLogKey] = useState<string | null>(null);
  const [selectedLogKeys, setSelectedLogKeys] = useState<Set<string>>(
    new Set(),
  );
  const selectAllLogsRef = useRef<HTMLInputElement>(null);
  const [showBulkDeleteLogsConfirm, setShowBulkDeleteLogsConfirm] =
    useState(false);
  const [deleteLicenseId, setDeleteLicenseId] = useState<string | null>(null);
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<string>>(
    new Set(),
  );
  const selectAllPurchasesRef = useRef<HTMLInputElement>(null);
  const [showBulkDeletePurchasesConfirm, setShowBulkDeletePurchasesConfirm] =
    useState(false);
  // Transaction logs state
  const { data: transactionLogs, isLoading: isLoadingTransactionLogs } =
    useGetTransactionLogs();
  const deleteTransactionLog = useDeleteTransactionLog();
  const bulkDeleteTransactionLogs = useBulkDeleteTransactionLogs();
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    Set<string>
  >(new Set());
  const selectAllTransactionsRef = useRef<HTMLInputElement>(null);
  const [
    showBulkDeleteTransactionsConfirm,
    setShowBulkDeleteTransactionsConfirm,
  ] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(
    null,
  );
  const [viewingTransaction, setViewingTransaction] =
    useState<TransactionLog | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [showLegacyLogs, setShowLegacyLogs] = useState(false);
  const [selectedAuditUser, setSelectedAuditUser] = useState<{
    email: string;
    role: string;
    events: any[];
  } | null>(null);
  const [selectedAuditEmails, setSelectedAuditEmails] = useState<Set<string>>(
    new Set(),
  );

  // Image upload states
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(
    null,
  );
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  const [newFeature, setNewFeature] = useState({
    id: "",
    name: "",
    description: "",
    isPremium: false,
    isActive: true,
    priceInCents: 0,
    featureType: "Premium",
    licenseReferenceName: "",
  });

  const [emailFormData, setEmailFormData] = useState({
    emailSubject: "",
    emailBody: "",
  });

  const [resendFormData, setResendFormData] = useState({
    apiKey: "",
    baseUrl: "https://api.resend.com",
    senderEmail: "",
    serviceName: "BAMM_Email",
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [macUploadProgress, setMacUploadProgress] = useState(0);
  const [isMacUploading, setIsMacUploading] = useState(false);
  const [windowsUploadProgress, setWindowsUploadProgress] = useState(0);
  const [isWindowsUploading, setIsWindowsUploading] = useState(false);

  useEffect(() => {
    if (emailSettings) {
      setEmailFormData({
        emailSubject: emailSettings.emailSubject,
        emailBody: emailSettings.emailBody,
      });
    }
  }, [emailSettings]);

  // Sync stripeKeyConfigured from backend configStatus on load
  // Use undefined-check so we don't flash "not configured" while the query is still loading
  useEffect(() => {
    if (configStatus !== undefined) {
      setStripeKeyConfigured(!!configStatus.stripeConfigured);
    }
  }, [configStatus]);

  useEffect(() => {
    if (resendConfig) {
      setResendFormData({
        apiKey: resendConfig.apiKey,
        baseUrl: resendConfig.baseUrl,
        senderEmail: resendConfig.senderEmail,
        serviceName: resendConfig.serviceName,
      });
    }
  }, [resendConfig]);

  // Initialize default premium features if none exist
  useEffect(() => {
    if (
      isAdmin &&
      licenseFeatures &&
      licenseFeatures.length === 0 &&
      !featuresInitialized
    ) {
      handleInitializeFeatures();
    }
  }, [isAdmin, licenseFeatures, featuresInitialized]);

  const { data: pendingInvite } = useCheckAnyPendingInvite();

  // Redirect non-admin users to access denied page
  // If they have a pending invite, send them to the accept-invite page instead
  useEffect(() => {
    if (!adminLoading && isAdmin === false) {
      if (pendingInvite) {
        const email = pendingInvite.email?.[0] ?? "";
        if (email) {
          navigate({ to: "/admin/accept-invite", search: { email } });
        } else {
          navigate({
            to: "/admin/accept-invite",
            search: { email: undefined },
          });
        }
      } else {
        navigate({ to: "/access-denied", search: { email: undefined } });
      }
    }
  }, [isAdmin, adminLoading, pendingInvite, navigate]);

  const handleInitializeFeatures = async () => {
    try {
      await initializeFeatures.mutateAsync();
      setFeaturesInitialized(true);
      toast.success("Default premium features initialized successfully");
    } catch (error) {
      console.error("Feature initialization error:", error);
      toast.error("Failed to initialize features");
    }
  };

  const handleInitializeCoreFeatures = async () => {
    try {
      const result = await initializeCoreFeatures.mutateAsync();
      if (result.created === 0) {
        toast.success("Free features already present");
      } else {
        toast.success(
          `Initialized ${result.created} free feature${result.created === 1 ? "" : "s"}`,
        );
      }
    } catch (error) {
      console.error("Core feature initialization error:", error);
      toast.error("Failed to initialize free features");
    }
  };

  const premiumFeaturesList = useMemo(
    () => (licenseFeatures ?? []).filter((f) => f.isPremium),
    [licenseFeatures],
  );
  const freeFeaturesList = useMemo(
    () => (licenseFeatures ?? []).filter((f) => !f.isPremium),
    [licenseFeatures],
  );

  const handleStripeSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!secretKey.trim()) {
      toast.error("Please enter your Stripe secret key");
      return;
    }

    const countries = allowedCountries
      .split(",")
      .map((c) => c.trim().toUpperCase());

    try {
      await setStripeConfig.mutateAsync({
        secretKey: secretKey.trim(),
        allowedCountries: countries,
      });
      toast.success("Stripe configuration saved successfully");
      setSecretKey("");
      setStripeKeyConfigured(true);
    } catch (error) {
      console.error("Stripe setup error:", error);
      toast.error("Failed to save Stripe configuration");
    }
  };

  // AUDITED: This handler ONLY calls deleteUserSubmission.mutateAsync(email).
  // It does NOT navigate to any download page, does NOT call any email/license
  // function, and has zero side effects beyond deleting the record.
  const handleDeleteUserSubmission = async (email: string) => {
    console.log("[AdminPanel] Deleting user submission:", email);
    try {
      await deleteUserSubmission.mutateAsync(email);
      console.log("[AdminPanel] User submission deleted successfully:", email);
      toast.success("User submission deleted successfully");
      setDeleteSubmissionEmail(null);
    } catch (error) {
      console.error("[AdminPanel] Delete submission error:", error);
      toast.error("Failed to delete user submission");
    }
  };

  const handleDeleteEmailLog = async (logKey: string) => {
    try {
      await deleteEmailLog.mutateAsync(logKey);
      toast.success("Email log deleted successfully");
      setDeleteLogKey(null);
      setSelectedLogKeys((prev) => {
        const next = new Set(prev);
        next.delete(logKey);
        return next;
      });
    } catch (error) {
      console.error("Delete email log error:", error);
      toast.error("Failed to delete email log");
    }
  };

  const toggleLogSelection = (key: string) => {
    setSelectedLogKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAllLogs = () => {
    if (!emailLogs) return;
    if (selectedLogKeys.size === emailLogs.length) {
      setSelectedLogKeys(new Set());
    } else {
      setSelectedLogKeys(
        new Set(emailLogs.map((log, idx) => getEmailLogKey(log, idx))),
      );
    }
  };

  useEffect(() => {
    if (selectAllLogsRef.current) {
      const allCount = emailLogs?.length ?? 0;
      selectAllLogsRef.current.indeterminate =
        selectedLogKeys.size > 0 && selectedLogKeys.size < allCount;
    }
  }, [selectedLogKeys, emailLogs]);

  const handleBulkDeleteLogs = () => {
    if (selectedLogKeys.size === 0) return;
    bulkDeleteEmailLogs.mutate(Array.from(selectedLogKeys), {
      onSuccess: () => {
        setSelectedLogKeys(new Set());
      },
    });
  };
  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllTransactions = () => {
    if (!transactionLogs) return;
    if (selectedTransactionIds.size === transactionLogs.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(transactionLogs.map((t) => t.id)));
    }
  };

  const handleBulkDeleteTransactions = () => {
    if (selectedTransactionIds.size === 0) return;
    bulkDeleteTransactionLogs.mutate(Array.from(selectedTransactionIds), {
      onSuccess: () => {
        setSelectedTransactionIds(new Set());
        setShowBulkDeleteTransactionsConfirm(false);
      },
    });
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransactionLog.mutate(id, {
      onSuccess: () => setDeleteTransactionId(null),
    });
  };

  const formatAmount = (amountPaid: string): string => {
    if (!amountPaid || amountPaid === "0" || amountPaid === "0.00") return "—";
    const num = Number.parseFloat(amountPaid);
    if (Number.isNaN(num) || num === 0) return "—";
    return amountPaid.startsWith("$") ? amountPaid : `${num.toFixed(2)}`;
  };

  const openTransactionModal = (tx: TransactionLog) => {
    setViewingTransaction(tx);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteLicenseRecord = async (licenseId: string) => {
    try {
      await deleteLicenseRecord.mutateAsync(licenseId);
      toast.success("License record deleted successfully");
      setDeleteLicenseId(null);
    } catch (error) {
      console.error("Delete license record error:", error);
      toast.error("Failed to delete license record");
    }
  };

  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFeature.id || !newFeature.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    const featureTypeVal = newFeature.featureType || "Premium";
    const feature: LicenseFeature = {
      id: newFeature.id,
      name: newFeature.name,
      description: newFeature.description,
      featureType: featureTypeVal,
      isPremium: featureTypeVal !== "Core",
      isActive: newFeature.isActive,
      priceInCents: BigInt(newFeature.priceInCents || 0),
      licenseReferenceName: newFeature.licenseReferenceName ?? "",
    };

    try {
      await addLicenseFeature.mutateAsync(feature);
      toast.success("Feature added successfully");
      setShowAddFeature(false);
      setNewFeature({
        id: "",
        name: "",
        description: "",
        isPremium: false,
        isActive: true,
        priceInCents: 0,
        featureType: "Premium",
        licenseReferenceName: "",
      });
    } catch (error) {
      console.error("Add feature error:", error);
      toast.error("Failed to add feature");
    }
  };

  const handleEditFeature = (feature: LicenseFeature) => {
    setEditingFeature(feature);
    setShowEditFeature(true);
  };

  const handleUpdateFeature = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingFeature) return;

    const editFeatureType = editingFeature.featureType || "Premium";
    const updatedFeature: LicenseFeature = {
      ...editingFeature,
      featureType: editFeatureType,
      isPremium: editFeatureType !== "Core",
      licenseReferenceName: editingFeature.licenseReferenceName ?? "",
    };

    try {
      await updateLicenseFeature.mutateAsync(updatedFeature);
      toast.success("Feature updated successfully");
      setShowEditFeature(false);
      setEditingFeature(null);
    } catch (error) {
      console.error("Update feature error:", error);
      toast.error("Failed to update feature");
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return;

    try {
      await deleteLicenseFeature.mutateAsync(featureId);
      toast.success("Feature deleted successfully");
    } catch (error) {
      console.error("Delete feature error:", error);
      toast.error("Failed to delete feature");
    }
  };

  const handleToggleFeatureStatus = async (
    featureId: string,
    currentStatus: boolean,
  ) => {
    try {
      await updateFeatureStatus.mutateAsync({
        featureId,
        isActive: !currentStatus,
      });
      toast.success(
        `Feature ${!currentStatus ? "enabled" : "disabled"} successfully`,
      );
    } catch (error) {
      console.error("Toggle feature status error:", error);
      toast.error("Failed to update feature status");
    }
  };

  const handleFeatureImageUpload = async (
    featureId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      e.target.value = "";
      return;
    }

    try {
      setUploadingImageFor(featureId);
      setImageUploadProgress(0);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
        (percentage) => {
          setImageUploadProgress(percentage);
        },
      );

      await uploadFeatureImage.mutateAsync({ featureId, image: blob });
      toast.success("Feature image uploaded successfully");
      setImageUploadProgress(0);
    } catch (error) {
      console.error("Feature image upload error:", error);
      toast.error("Failed to upload feature image");
    } finally {
      setUploadingImageFor(null);
      e.target.value = "";
    }
  };

  const handleRemoveFeatureImage = async (featureId: string) => {
    if (!confirm("Are you sure you want to remove this image?")) return;

    try {
      await removeFeatureImage.mutateAsync(featureId);
      toast.success("Feature image removed successfully");
    } catch (error) {
      console.error("Remove feature image error:", error);
      toast.error("Failed to remove feature image");
    }
  };

  const handleEditPurchase = (purchase: PremiumPurchase) => {
    setEditingPurchase(purchase);
    setEditingPurchaseFeatures([]);
    setShowEditPurchase(true);
  };

  const handleTogglePurchaseFeature = (featureId: string) => {
    setEditingPurchaseFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId],
    );
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return;

    try {
      await updatePurchaseMutation.mutateAsync({
        transactionId: editingPurchase.transactionId,
        features: editingPurchaseFeatures,
      });
      toast.success("Purchase updated successfully");
      setShowEditPurchase(false);
      setEditingPurchase(null);
      setEditingPurchaseFeatures([]);
    } catch (error: any) {
      console.error("Update purchase error:", error);
      const errorMessage = error?.message || "Failed to update purchase";
      toast.error(errorMessage);
    }
  };

  const handleTogglePurchaseSelection = (id: string) => {
    setSelectedPurchaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllPurchases = () => {
    if (!purchases) return;
    if (selectedPurchaseIds.size === purchases.length) {
      setSelectedPurchaseIds(new Set());
    } else {
      setSelectedPurchaseIds(new Set(purchases.map((p) => p.transactionId)));
    }
  };

  const handleDeletePurchase = (transactionId: string) => {
    setDeletePurchaseId(transactionId);
  };

  const handleBulkDeletePurchases = () => {
    if (selectedPurchaseIds.size === 0) return;
    setShowBulkDeletePurchasesConfirm(true);
  };

  const confirmDeletePurchase = async () => {
    if (!deletePurchaseId) return;
    try {
      await deletePurchaseMutation.mutateAsync(deletePurchaseId);
      toast.success("Purchase deleted successfully");
      setSelectedPurchaseIds((prev) => {
        const next = new Set(prev);
        next.delete(deletePurchaseId);
        return next;
      });
      setDeletePurchaseId(null);
    } catch (error) {
      console.error("Delete purchase error:", error);
      toast.error("Failed to delete purchase");
    }
  };

  const confirmBulkDeletePurchases = () => {
    if (selectedPurchaseIds.size === 0) return;
    bulkDeletePurchasesMutation.mutate(Array.from(selectedPurchaseIds), {
      onSuccess: () => {
        toast.success(
          `${selectedPurchaseIds.size} purchase${
            selectedPurchaseIds.size !== 1 ? "s" : ""
          } deleted successfully`,
        );
        setSelectedPurchaseIds(new Set());
        setShowBulkDeletePurchasesConfirm(false);
      },
      onError: () => {
        toast.error("Failed to delete purchases");
      },
    });
  };

  const handleResendLicense = async (purchase: PremiumPurchase) => {
    if (!confirm(`Resend license to ${purchase.email}?`)) return;

    try {
      await resendLicenseMutation.mutateAsync({
        transactionId: purchase.transactionId,
        email: purchase.email,
      });
      toast.success("License regenerated and sent successfully");
    } catch (error: any) {
      console.error("Resend license error:", error);
      const errorMessage = error?.message || "Failed to resend license";
      toast.error(errorMessage);
    }
  };

  const handleEmailSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailFormData.emailSubject.trim() || !emailFormData.emailBody.trim()) {
      toast.error("Please fill in all email settings fields");
      return;
    }

    try {
      await updateEmailSettings.mutateAsync({
        emailSubject: emailFormData.emailSubject.trim(),
        emailBody: emailFormData.emailBody.trim(),
      });
      toast.success("Email automation settings updated successfully");
    } catch (error) {
      console.error("Email settings update error:", error);
      toast.error("Failed to update email settings");
    }
  };

  const handleResendConfigUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !resendFormData.apiKey.trim() ||
      !resendFormData.baseUrl.trim() ||
      !resendFormData.senderEmail.trim() ||
      !resendFormData.serviceName.trim()
    ) {
      toast.error("Please fill in all RESEND configuration fields");
      return;
    }

    if (!resendFormData.senderEmail.includes("@")) {
      toast.error("Please enter a valid sender email address");
      return;
    }

    try {
      const config: ResendConfiguration = {
        apiKey: resendFormData.apiKey.trim(),
        baseUrl: resendFormData.baseUrl.trim(),
        senderEmail: resendFormData.senderEmail.trim(),
        serviceName: resendFormData.serviceName.trim(),
      };

      await setResendConfig.mutateAsync(config);
      toast.success("RESEND API configuration saved successfully");
    } catch (error) {
      console.error("RESEND config update error:", error);
      toast.error("Failed to update RESEND configuration");
    }
  };

  const handleTestResendConnection = async () => {
    try {
      const result = await testResendConnection.mutateAsync();
      if (result.__kind__ === "ok") {
        toast.success("RESEND connection test successful");
      } else {
        toast.error(`RESEND connection test failed: ${result.err}`);
      }
    } catch (error: any) {
      console.error("RESEND connection test error:", error);
      toast.error("Failed to test RESEND connection");
    }
  };

  const handleLicenseFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
        (percentage) => {
          setUploadProgress(percentage);
        },
      );

      await uploadLicenseFile.mutateAsync(blob);
      toast.success("Trial license file uploaded successfully");
      setUploadProgress(0);
    } catch (error) {
      console.error("License file upload error:", error);
      toast.error("Failed to upload license file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleMacInstallerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.toLowerCase().endsWith(".dmg")) {
      toast.error("Please select a .dmg file for Mac installer");
      e.target.value = "";
      return;
    }

    const parsed = parseDesktopInstallerFileName(file.name);
    if (!parsed) {
      toast.error(
        "Use GitHub release naming: BAMM-{semver}-arm64.dmg (e.g. BAMM-30.3.7-arm64.dmg)",
      );
      e.target.value = "";
      return;
    }

    try {
      setIsMacUploading(true);
      setMacUploadProgress(0);

      await uploadMacInstaller.mutateAsync({
        file,
        onProgress: (pct) => setMacUploadProgress(pct),
      });
      toast.success("Mac installer uploaded successfully");
      setMacUploadProgress(0);
    } catch (error) {
      console.error("Mac installer upload error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to upload Mac installer";
      toast.error(message);
    } finally {
      setIsMacUploading(false);
      e.target.value = "";
    }
  };

  const handleWindowsInstallerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.toLowerCase().endsWith(".exe")) {
      toast.error("Please select a .exe file for Windows installer");
      e.target.value = "";
      return;
    }

    const parsed = parseDesktopInstallerFileName(file.name);
    if (!parsed || parsed.platform !== "windows") {
      toast.error(
        "Use GitHub release naming: BAMM-{semver}.exe (e.g. BAMM-30.3.7.exe)",
      );
      e.target.value = "";
      return;
    }

    try {
      setIsWindowsUploading(true);
      setWindowsUploadProgress(0);

      await uploadWindowsInstaller.mutateAsync({
        file,
        onProgress: (pct) => setWindowsUploadProgress(pct),
      });
      toast.success("Windows installer uploaded successfully");
      setWindowsUploadProgress(0);
    } catch (error) {
      console.error("Windows installer upload error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to upload Windows installer";
      toast.error(message);
    } finally {
      setIsWindowsUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (showInviteAdmin) {
      setInviteEmailStatus(null);
    }
  }, [showInviteAdmin]);

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const existingAdmin = (adminList as Array<{ email: string }>)?.find(
      (a) => a.email === inviteForm.email.trim(),
    );
    if (existingAdmin) {
      setInviteEmailStatus({
        type: "error",
        message:
          'This person already has an admin role. Use "Elevate Role" to change their role.',
      });
      return;
    }
    if (
      !inviteForm.name.trim() ||
      !inviteForm.email.trim() ||
      !inviteForm.role
    ) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const result = await inviteAdmin.mutateAsync(inviteForm);
      if (result.success) {
        toast.success(result.message);
        setShowInviteAdmin(false);
        setInviteForm({ name: "", email: "", role: "" });
        setInviteEmailStatus({ type: "success", message: result.message });
      } else {
        setInviteEmailStatus({
          type: "error",
          message: `Admin account created but email delivery failed: ${result.message}`,
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    }
  };

  const handleElevateRole = async () => {
    if (!elevatingAdmin || !elevateTargetRole) return;
    setElevateLoading(true);
    setElevateError("");
    setElevateSuccess("");
    try {
      await elevateAdminRole.mutateAsync({
        adminId: elevatingAdmin.id,
        newRole: elevateTargetRole,
      });
      setElevateSuccess(
        `Elevation email sent to ${elevatingAdmin.email}. Their status will show as Pending until they activate.`,
      );
      setTimeout(() => {
        setShowElevateDialog(false);
        setElevatingAdmin(null);
        setElevateTargetRole("");
        setElevateSuccess("");
      }, 3000);
    } catch (e: unknown) {
      setElevateError(
        e instanceof Error ? e.message : "Failed to send elevation email",
      );
    } finally {
      setElevateLoading(false);
    }
  };

  const handleUpdateAdminRole = async () => {
    if (!editingAdminEmail || !editingAdminRole) return;
    try {
      await updateAdminRole.mutateAsync({
        email: editingAdminEmail,
        role: editingAdminRole,
      });
      toast.success("Admin role updated successfully");
      setEditingAdminEmail(null);
      setEditingAdminRole("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleDeactivateAdmin = async (email: string) => {
    try {
      await deactivateAdmin.mutateAsync(email);
      toast.success("Admin deactivated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate admin",
      );
    }
  };

  const handleReactivateAdmin = async (email: string) => {
    try {
      await reactivateAdmin.mutateAsync(email);
      toast.success("Admin reactivated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reactivate admin",
      );
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    try {
      await deleteAdmin.mutateAsync(email);
      toast.success("Admin deleted");
      setDeleteAdminEmail(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete admin",
      );
    }
  };

  const handleBootstrapSuperAdmin = async () => {
    if (!bootstrapName.trim() || !bootstrapEmail.trim()) {
      toast.error("Name and email are required to initialize admin roles");
      return;
    }
    try {
      const msg = await bootstrapSuperAdmin.mutateAsync({
        name: bootstrapName.trim(),
        email: bootstrapEmail.trim(),
      });
      toast.success(msg || "Super admin initialized successfully");
      setBootstrapName("");
      setBootstrapEmail("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to initialize RBAC",
      );
    }
  };

  const downloadAuditLog = () => {
    if (!auditLog) return;
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BAMM-Audit-Log-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPrice = (priceInCents: bigint) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(priceInCents) / 100);
  };

  const _formatTimestamp = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };

  // Generate log key from email log for deletion
  const getEmailLogKey = (log: any, _idx: number) => {
    // Try to reconstruct the key as email-timestamp
    return `${log.email}-${log.sentTimestamp}`;
  };

  // Show loading state while checking admin status or role
  if (adminLoading || stripeLoading || roleLoading) {
    return (
      <div className="container py-20 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not admin (redirect will happen via useEffect)
  if (!isAdmin) {
    return null;
  }

  const premiumFeatures =
    licenseFeatures?.filter((f) => f.isPremium && f.isActive) || [];
  // RESEND key presence is SSOT (getConfigurationStatus). Do not gate on trialLicenseFile —
  // networked v2 licenses are signed on-canister (PEM); the legacy trial file is optional.
  const isEmailSystemConfigured = !!configStatus?.resendConfigured;

  return (
    <div className="container py-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div>
              <h1 className="text-3xl font-bold">BAMM Admin Panel</h1>
              <p
                className="text-xs font-mono text-muted-foreground mt-1"
                title={`commit ${STOREFRONT_COMMIT}`}
              >
                Storefront {STOREFRONT_VERSION}
              </p>
            </div>
            <p className="text-muted-foreground">
              Comprehensive management dashboard for your BAMM e-commerce
              platform
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant={
                configStatus?.stripeConfigured ? "default" : "destructive"
              }
              className={
                configStatus?.stripeConfigured ? "bg-green-600 text-white" : ""
              }
            >
              {configStatus?.stripeConfigured
                ? "✓ Stripe Ready"
                : "✗ Stripe Key Missing — Payments Disabled"}
            </Badge>
            <Badge
              variant={
                configStatus?.privateKeyPresent ? "default" : "destructive"
              }
              className={
                configStatus?.privateKeyPresent ? "bg-green-600 text-white" : ""
              }
            >
              {configStatus?.privateKeyPresent
                ? "✓ License Signing Ready"
                : "✗ Private Key Missing — License Generation Disabled"}
            </Badge>
            <Badge
              variant={
                configStatus?.resendConfigured ? "default" : "destructive"
              }
              className={
                configStatus?.resendConfigured ? "bg-green-600 text-white" : ""
              }
            >
              {configStatus?.resendConfigured
                ? "✓ Email System Ready"
                : "✗ RESEND Key Missing — Email Disabled"}
            </Badge>
            <Badge
              variant="default"
              className={getRoleBadgeClass(effectiveRole ?? "")}
            >
              Profile Active ({roleToString(effectiveRole ?? "")})
            </Badge>
          </div>
        </div>

        {!isEmailSystemConfigured && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-500">
              Email System Configuration Required
            </AlertTitle>
            <AlertDescription className="text-yellow-500/90">
              To enable automated email delivery for trial licenses and premium
              purchases, please:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Configure and save RESEND API settings in the Automation tab
                  (API key, sender email, service name)
                </li>
                <li>
                  Run <strong>Test Connection</strong> in the Automation tab
                  until it succeeds
                </li>
                <li>
                  Ensure the RSA private key is uploaded (Config / License
                  signing) so license emails can be generated
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {configStatus?.stripeConfigured || stripeKeyConfigured
                ? "Stripe Configured"
                : "Stripe Configuration Required"}
            </CardTitle>
            <CardDescription>
              {configStatus?.stripeConfigured || stripeKeyConfigured
                ? "Your Stripe secret key is configured and payments are enabled."
                : "Configure Stripe to enable premium purchases. You'll need your Stripe secret key."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!(configStatus?.stripeConfigured || stripeKeyConfigured) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-800 text-sm">
                ⚠️ Stripe is not configured. Premium purchases will fail until
                you save your Stripe secret key below.
              </div>
            )}
            <form onSubmit={handleStripeSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secretKey">Stripe Secret Key</Label>
                {configStatus?.stripeConfigured || stripeKeyConfigured ? (
                  <div className="flex gap-2">
                    <Input
                      id="secretKey"
                      type="password"
                      value="••••••••••••••••"
                      readOnly
                      disabled
                      className="font-mono bg-muted text-muted-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStripeKeyConfigured(false);
                        setSecretKey("");
                      }}
                      disabled={setStripeConfig.isPending}
                    >
                      Change Key
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="secretKey"
                    type="password"
                    placeholder="sk_live_... or sk_test_..."
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    disabled={setStripeConfig.isPending}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="countries">
                  Allowed Countries (comma-separated)
                </Label>
                <Input
                  id="countries"
                  placeholder="US,CA,GB"
                  value={allowedCountries}
                  onChange={(e) => setAllowedCountries(e.target.value)}
                  disabled={setStripeConfig.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Use ISO 3166-1 alpha-2 country codes (e.g., US, CA, GB)
                </p>
              </div>

              {!(configStatus?.stripeConfigured || stripeKeyConfigured) && (
                <Button type="submit" disabled={setStripeConfig.isPending}>
                  {setStripeConfig.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            {isAdministratorOrAbove && (
              <TabsTrigger value="submissions">
                <Users className="h-4 w-4 mr-2" />
                Submissions
              </TabsTrigger>
            )}
            {isAdministratorOrAbove && (
              <TabsTrigger value="purchases">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchases
              </TabsTrigger>
            )}
            {canSeeFeaturesTab && (
              <TabsTrigger value="features">
                <ToggleLeft className="h-4 w-4 mr-2" />
                Features Management
              </TabsTrigger>
            )}
            {isAdministratorOrAbove && (
              <TabsTrigger value="emails">
                <Mail className="h-4 w-4 mr-2" />
                Logs
              </TabsTrigger>
            )}
            {isAdministratorOrAbove && (
              <TabsTrigger value="automation">
                <FileText className="h-4 w-4 mr-2" />
                Automation
              </TabsTrigger>
            )}
            {canSeeLicensesTab && (
              <TabsTrigger value="licenses">
                <Key className="h-4 w-4 mr-2" />
                Licenses
              </TabsTrigger>
            )}
            {isAdministratorOrAbove && (
              <TabsTrigger value="installers">
                <Download className="h-4 w-4 mr-2" />
                Installers
              </TabsTrigger>
            )}
            {isAdministratorOrAbove && (
              <TabsTrigger value="admin-management">
                <Shield className="h-4 w-4 mr-2" />
                Admin Management
              </TabsTrigger>
            )}
            <TabsTrigger value="audit-log">
              <ClipboardList className="h-4 w-4 mr-2" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>User Submissions</CardTitle>
                <CardDescription>
                  Users who downloaded the free version
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissions && submissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Downloads</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>License Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((sub) => (
                        <TableRow key={sub.email}>
                          <TableCell>{sub.name}</TableCell>
                          <TableCell>{sub.email}</TableCell>
                          <TableCell>{Number(sub.downloadCount)}</TableCell>
                          <TableCell>
                            {new Date(
                              Number(sub.timestamp) / 1000000,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const hasTrial = licenseRecords?.some(
                                (r) =>
                                  r.recipientEmail === sub.email &&
                                  r.deliveryStatus === "trial_sent",
                              );
                              const hasPaid = licenseRecords?.some(
                                (r) =>
                                  r.recipientEmail === sub.email &&
                                  r.deliveryStatus === "paid_sent",
                              );
                              const isLicensed =
                                sub.name?.includes("[Licensed]") ?? false;
                              if (hasPaid || isLicensed) {
                                return (
                                  <Badge className="bg-blue-600 text-white">
                                    Licensed
                                  </Badge>
                                );
                              }
                              if (hasTrial) {
                                return (
                                  <Badge className="bg-green-600 text-white">
                                    License Sent
                                  </Badge>
                                );
                              }
                              return <Badge variant="secondary">Pending</Badge>;
                            })()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteSubmissionEmail(sub.email)
                              }
                              disabled={deleteUserSubmission.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No submissions yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Tabs defaultValue="premium-purchases" className="space-y-4">
              <TabsList>
                <TabsTrigger value="premium-purchases">
                  Premium Purchases
                </TabsTrigger>
                <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
              </TabsList>

              <TabsContent value="premium-purchases">
                <Card>
                  <CardHeader>
                    <CardTitle>Premium Purchases</CardTitle>
                    <CardDescription>
                      Completed premium transactions with license management
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {purchases && purchases.length > 0 ? (
                      <>
                        {selectedPurchaseIds.size > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleBulkDeletePurchases}
                            >
                              Delete Selected ({selectedPurchaseIds.size})
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {selectedPurchaseIds.size} selected
                            </span>
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <input
                                  type="checkbox"
                                  ref={selectAllPurchasesRef}
                                  onChange={handleSelectAllPurchases}
                                  className="cursor-pointer"
                                />
                              </TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Entitlement</TableHead>
                              <TableHead>Payment ID</TableHead>
                              <TableHead>Confirmed</TableHead>
                              <TableHead>Features</TableHead>
                              <TableHead>Transaction ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchases.map((purchase) => (
                              <TableRow
                                key={
                                  purchase.transactionId ||
                                  purchase.stripeSessionId ||
                                  purchase.email
                                }
                              >
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedPurchaseIds.has(
                                      purchase.transactionId,
                                    )}
                                    onChange={() =>
                                      handleTogglePurchaseSelection(
                                        purchase.transactionId,
                                      )
                                    }
                                    className="cursor-pointer"
                                  />
                                </TableCell>
                                <TableCell>{purchase.email}</TableCell>
                                <TableCell>
                                  {purchase.customerName || "N/A"}
                                </TableCell>
                                <TableCell>
                                  ${(Number(purchase.amount) / 100).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      purchase.status === "completed"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {purchase.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {purchase.entitlementId ? (
                                    <code
                                      title={purchase.entitlementId}
                                      className="text-xs font-mono"
                                    >
                                      {purchase.entitlementId.substring(0, 10)}…
                                    </code>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <code
                                    title={purchase.stripeSessionId}
                                    className="text-xs font-mono"
                                  >
                                    {purchase.stripeSessionId
                                      ? `${purchase.stripeSessionId.substring(0, 16)}...`
                                      : "N/A"}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      purchase.paymentConfirmation === "paid"
                                        ? "bg-green-600 text-white"
                                        : "bg-yellow-600 text-white"
                                    }
                                  >
                                    {purchase.paymentConfirmation || "pending"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {(purchase.features || []).map((f) => (
                                      <Badge
                                        key={f}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {f}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {purchase.transactionId}
                                </TableCell>
                                <TableCell>
                                  {new Date(
                                    Number(purchase.timestamp) / 1000000,
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleEditPurchase(purchase)
                                      }
                                      title="Edit features"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleResendLicense(purchase)
                                      }
                                      disabled={resendLicenseMutation.isPending}
                                      title="Resend license"
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleDeletePurchase(
                                          purchase.transactionId,
                                        )
                                      }
                                      title="Delete purchase record"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No purchases yet
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Edit Purchase Dialog */}
                <Dialog
                  open={showEditPurchase}
                  onOpenChange={setShowEditPurchase}
                >
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit Purchase Features</DialogTitle>
                      <DialogDescription>
                        Modify the selected features for this purchase. A new
                        license will be generated when you save.
                      </DialogDescription>
                    </DialogHeader>
                    {editingPurchase && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Email
                            </p>
                            <p className="font-medium">
                              {editingPurchase.email}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Transaction ID
                            </p>
                            <p className="font-mono text-xs">
                              {editingPurchase.transactionId}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">
                            Stripe Payment ID
                          </Label>
                          <code className="block text-xs font-mono bg-muted p-2 rounded">
                            {editingPurchase?.stripeSessionId || "N/A"}
                          </code>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">
                            Payment Status
                          </Label>
                          <div>
                            <Badge
                              className={
                                editingPurchase?.paymentConfirmation === "paid"
                                  ? "bg-green-600 text-white"
                                  : "bg-yellow-600 text-white"
                              }
                            >
                              {editingPurchase?.paymentConfirmation ||
                                "pending"}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Select Premium Features</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {premiumFeatures.map((feature) => {
                              const isSelected =
                                editingPurchaseFeatures.includes(feature.id);
                              return (
                                <Card
                                  key={feature.id}
                                  className={`cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-primary ring-2 ring-primary/20"
                                      : "hover:border-primary/50"
                                  }`}
                                  onClick={() =>
                                    handleTogglePurchaseFeature(feature.id)
                                  }
                                >
                                  <CardHeader className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                          {feature.name}
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {formatPrice(feature.priceInCents)}
                                          </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                          {feature.description}
                                        </CardDescription>
                                      </div>
                                      <div
                                        className={`
                                    h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-2
                                    ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}
                                  `}
                                      >
                                        {isSelected && (
                                          <Check className="h-3 w-3 text-primary-foreground" />
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                </Card>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={handleUpdatePurchase}
                            disabled={
                              updatePurchaseMutation.isPending ||
                              editingPurchaseFeatures.length === 0
                            }
                            className="flex-1"
                          >
                            {updatePurchaseMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowEditPurchase(false)}
                            disabled={updatePurchaseMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </TabsContent>
              <TabsContent value="entitlements">
                <EntitlementRegistryPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="/assets/generated/feature-toggle-icon-transparent.dim_64x64.png"
                      alt="Features"
                      className="h-8 w-8"
                    />
                    <div>
                      <CardTitle>Features Management</CardTitle>
                      <CardDescription>
                        Manage Premium products and Free Feature marketing images
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {licenseFeatures && premiumFeaturesList.length === 0 && (
                      <Button
                        variant="outline"
                        onClick={handleInitializeFeatures}
                        disabled={initializeFeatures.isPending}
                      >
                        {initializeFeatures.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Initializing...
                          </>
                        ) : (
                          "Initialize Default Features"
                        )}
                      </Button>
                    )}
                    <Dialog
                      open={showAddFeature}
                      onOpenChange={setShowAddFeature}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Feature
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Feature</DialogTitle>
                          <DialogDescription>
                            Create a new license feature with pricing
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddFeature} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="featureId">Feature ID</Label>
                            <Input
                              id="featureId"
                              placeholder="advanced-analytics"
                              value={newFeature.id}
                              onChange={(e) =>
                                setNewFeature({
                                  ...newFeature,
                                  id: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="featureName">Feature Name</Label>
                            <Input
                              id="featureName"
                              placeholder="Advanced Analytics"
                              value={newFeature.name}
                              onChange={(e) =>
                                setNewFeature({
                                  ...newFeature,
                                  name: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="featureDescription">
                              Description
                            </Label>
                            <Textarea
                              id="featureDescription"
                              placeholder="AI-powered pattern recognition and insights"
                              value={newFeature.description}
                              onChange={(e) =>
                                setNewFeature({
                                  ...newFeature,
                                  description: e.target.value,
                                })
                              }
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newFeaturePrice">Price ($)</Label>
                            <Input
                              id="newFeaturePrice"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={(newFeature.priceInCents || 0) / 100}
                              onChange={(e) =>
                                setNewFeature({
                                  ...newFeature,
                                  priceInCents: Math.round(
                                    Number.parseFloat(e.target.value || "0") *
                                      100,
                                  ),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newFeatureType">Type</Label>
                            <Select
                              value={newFeature.featureType || "Premium"}
                              onValueChange={(v) =>
                                setNewFeature({ ...newFeature, featureType: v })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Premium">Premium</SelectItem>
                                <SelectItem value="Core">Core</SelectItem>
                                <SelectItem value="Add-on">Add-on</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newLicenseReferenceName">
                              License Reference Name
                            </Label>
                            <Select
                              value={newFeature.licenseReferenceName ?? ""}
                              onValueChange={(v) =>
                                setNewFeature({
                                  ...newFeature,
                                  licenseReferenceName: v,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select license reference name" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Paycheck Budget">
                                  Paycheck Budget
                                </SelectItem>
                                <SelectItem value="Goals">Goals</SelectItem>
                                <SelectItem value="Tx Simulator">
                                  Tx Simulator
                                </SelectItem>
                                <SelectItem value="Migration Management">
                                  Migration Management
                                </SelectItem>
                                <SelectItem value="Database Management">
                                  Database Management
                                </SelectItem>
                                <SelectItem value="Trades">Trades</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Used in RSA license payloads — must match the
                              exact name validated by the BAMM app.
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="featureIsActive"
                              checked={newFeature.isActive}
                              onCheckedChange={(checked) =>
                                setNewFeature({
                                  ...newFeature,
                                  isActive: checked as boolean,
                                })
                              }
                            />
                            <Label
                              htmlFor="featureIsActive"
                              className="text-sm font-normal"
                            >
                              Active (enabled for use)
                            </Label>
                          </div>
                          <Button
                            type="submit"
                            disabled={addLicenseFeature.isPending}
                            className="w-full"
                          >
                            {addLicenseFeature.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Feature"
                            )}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Premium Features</h3>
                      <p className="text-sm text-muted-foreground">
                        Paid modules, pricing, and storefront product images
                      </p>
                    </div>
                  </div>
                {premiumFeaturesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>License Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {premiumFeaturesList.map((feature) => (
                        <TableRow key={feature.id}>
                          <TableCell>
                            <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                              {feature.image ? (
                                <img
                                  src={ExternalBlob.fromBytes(
                                    feature.image,
                                  ).getDirectURL()}
                                  alt={feature.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {feature.id}
                          </TableCell>
                          <TableCell>{feature.name}</TableCell>
                          <TableCell>
                            {feature.featureType ||
                              (feature.isPremium ? "Premium" : "Core")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {feature.licenseReferenceName || feature.name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {feature.description}
                          </TableCell>
                          <TableCell className="font-semibold">
                            $
                            {(Number(feature.priceInCents || 0) / 100).toFixed(
                              2,
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={feature.isActive}
                                onCheckedChange={() =>
                                  handleToggleFeatureStatus(
                                    feature.id,
                                    feature.isActive,
                                  )
                                }
                                disabled={updateFeatureStatus.isPending}
                              />
                              <span className="text-sm text-muted-foreground">
                                {feature.isActive ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleFeatureImageUpload(feature.id, e)
                                  }
                                  className="hidden"
                                  id={`image-upload-${feature.id}`}
                                  disabled={uploadingImageFor === feature.id}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    document
                                      .getElementById(
                                        `image-upload-${feature.id}`,
                                      )
                                      ?.click()
                                  }
                                  disabled={uploadingImageFor === feature.id}
                                  title={
                                    feature.image
                                      ? "Replace image"
                                      : "Upload image"
                                  }
                                >
                                  {uploadingImageFor === feature.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              {feature.image && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveFeatureImage(feature.id)
                                  }
                                  disabled={removeFeatureImage.isPending}
                                  title="Remove image"
                                >
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditFeature(feature)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteFeature(feature.id)}
                                disabled={deleteLicenseFeature.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground">
                      No premium features configured yet
                    </p>
                    <Button
                      onClick={handleInitializeFeatures}
                      disabled={initializeFeatures.isPending}
                    >
                      {initializeFeatures.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        "Initialize Default Premium Features"
                      )}
                    </Button>
                  </div>
                )}
                </div>

                <div className="space-y-4 border-t pt-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Free Features</h3>
                      <p className="text-sm text-muted-foreground">
                        Homepage Learn More images for Dashboard, Bill Files, and
                        Income and Bill Tracking
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleInitializeCoreFeatures}
                      disabled={initializeCoreFeatures.isPending}
                    >
                      {initializeCoreFeatures.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        "Initialize Default Free Features"
                      )}
                    </Button>
                  </div>
                  {freeFeaturesList.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {freeFeaturesList.map((feature) => (
                          <TableRow key={feature.id}>
                            <TableCell>
                              <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                {feature.image ? (
                                  <img
                                    src={ExternalBlob.fromBytes(
                                      feature.image,
                                    ).getDirectURL()}
                                    alt={feature.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {feature.id}
                            </TableCell>
                            <TableCell>{feature.name}</TableCell>
                            <TableCell className="max-w-md truncate">
                              {feature.description}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={feature.isActive}
                                  onCheckedChange={() =>
                                    handleToggleFeatureStatus(
                                      feature.id,
                                      feature.isActive,
                                    )
                                  }
                                  disabled={updateFeatureStatus.isPending}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {feature.isActive ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleFeatureImageUpload(feature.id, e)
                                    }
                                    className="hidden"
                                    id={`image-upload-${feature.id}`}
                                    disabled={uploadingImageFor === feature.id}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      document
                                        .getElementById(
                                          `image-upload-${feature.id}`,
                                        )
                                        ?.click()
                                    }
                                    disabled={uploadingImageFor === feature.id}
                                    title={
                                      feature.image
                                        ? "Replace image"
                                        : "Upload image"
                                    }
                                  >
                                    {uploadingImageFor === feature.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                {feature.image && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveFeatureImage(feature.id)
                                    }
                                    disabled={removeFeatureImage.isPending}
                                    title="Remove image"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditFeature(feature)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteFeature(feature.id)
                                  }
                                  disabled={deleteLicenseFeature.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 space-y-4 rounded-lg border border-dashed">
                      <p className="text-muted-foreground">
                        No free features yet. Initialize the three homepage
                        categories, then upload images.
                      </p>
                      <Button
                        onClick={handleInitializeCoreFeatures}
                        disabled={initializeCoreFeatures.isPending}
                      >
                        {initializeCoreFeatures.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Initializing...
                          </>
                        ) : (
                          "Initialize Default Free Features"
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {uploadingImageFor && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Uploading image...
                      </span>
                      <span className="font-medium">
                        {imageUploadProgress}%
                      </span>
                    </div>
                    <Progress value={imageUploadProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Feature Dialog */}
            <Dialog open={showEditFeature} onOpenChange={setShowEditFeature}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Feature</DialogTitle>
                  <DialogDescription>
                    Update feature configuration.
                  </DialogDescription>
                </DialogHeader>
                {editingFeature && (
                  <form onSubmit={handleUpdateFeature} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editFeatureName">Feature Name</Label>
                      <Input
                        id="editFeatureName"
                        value={editingFeature.name}
                        onChange={(e) =>
                          setEditingFeature({
                            ...editingFeature,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editFeatureDescription">
                        Description
                      </Label>
                      <Textarea
                        id="editFeatureDescription"
                        value={editingFeature.description}
                        onChange={(e) =>
                          setEditingFeature({
                            ...editingFeature,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-2">
                        <Label htmlFor="editFeaturePrice">Price ($)</Label>
                        <Input
                          id="editFeaturePrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={
                            Number(editingFeature.priceInCents || BigInt(0)) /
                            100
                          }
                          onChange={(e) =>
                            setEditingFeature({
                              ...editingFeature,
                              priceInCents: BigInt(
                                Math.round(
                                  Number.parseFloat(e.target.value || "0") *
                                    100,
                                ),
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editFeatureType">Type</Label>
                        <Select
                          value={editingFeature.featureType || "Premium"}
                          onValueChange={(v) =>
                            setEditingFeature({
                              ...editingFeature,
                              featureType: v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Premium">Premium</SelectItem>
                            <SelectItem value="Core">Core</SelectItem>
                            <SelectItem value="Add-on">Add-on</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editLicenseReferenceName">
                          License Reference Name
                        </Label>
                        <Select
                          value={editingFeature.licenseReferenceName ?? ""}
                          onValueChange={(v) =>
                            setEditingFeature({
                              ...editingFeature,
                              licenseReferenceName: v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select license reference name" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Paycheck Budget">
                              Paycheck Budget
                            </SelectItem>
                            <SelectItem value="Goals">Goals</SelectItem>
                            <SelectItem value="Tx Simulator">
                              Tx Simulator
                            </SelectItem>
                            <SelectItem value="Migration Management">
                              Migration Management
                            </SelectItem>
                            <SelectItem value="Database Management">
                              Database Management
                            </SelectItem>
                            <SelectItem value="Trades">Trades</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Used in RSA license payloads — must match the exact
                          name validated by the BAMM app.
                        </p>
                      </div>
                      <Checkbox
                        id="editFeatureIsActive"
                        checked={editingFeature.isActive}
                        onCheckedChange={(checked) =>
                          setEditingFeature({
                            ...editingFeature,
                            isActive: checked as boolean,
                          })
                        }
                      />
                      <Label
                        htmlFor="editFeatureIsActive"
                        className="text-sm font-normal"
                      >
                        Active (enabled for use)
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      disabled={updateLicenseFeature.isPending}
                      className="w-full"
                    >
                      {updateLicenseFeature.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Feature"
                      )}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
            <BundleManagementPanel />
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Email Delivery Logs</h2>
                <p className="text-sm text-muted-foreground">
                  Transaction records for all license deliveries
                </p>
              </div>
              {selectedTransactionIds.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setShowBulkDeleteTransactionsConfirm(true)}
                >
                  Delete Selected ({selectedTransactionIds.size})
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          ref={
                            selectAllTransactionsRef as React.RefObject<HTMLButtonElement>
                          }
                          checked={
                            !!(
                              transactionLogs &&
                              transactionLogs.length > 0 &&
                              selectedTransactionIds.size ===
                                transactionLogs.length
                            )
                          }
                          onCheckedChange={toggleSelectAllTransactions}
                        />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTransactionLogs ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          Loading transaction logs...
                        </TableCell>
                      </TableRow>
                    ) : !transactionLogs || transactionLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground py-8"
                        >
                          No transaction logs yet. Logs appear after Stripe
                          payments are processed.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactionLogs.map((tx) => (
                        <TableRow
                          key={tx.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openTransactionModal(tx)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedTransactionIds.has(tx.id)}
                              onCheckedChange={() =>
                                toggleTransactionSelection(tx.id)
                              }
                            />
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {tx.recipientEmail}
                          </TableCell>
                          <TableCell>
                            {`Premium License — ${tx.transactionId.slice(-4)}`}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {tx.transactionId}
                          </TableCell>
                          <TableCell>{formatAmount(tx.amountPaid)}</TableCell>
                          <TableCell className="max-w-[140px]">
                            {tx.features.length === 0
                              ? "—"
                              : tx.features.length === 1
                                ? tx.features[0]
                                : `${tx.features.length} features`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.licenseStatus === "sent"
                                  ? "default"
                                  : tx.licenseStatus === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className={
                                tx.licenseStatus === "sent"
                                  ? "bg-green-500 text-white"
                                  : ""
                              }
                            >
                              {tx.licenseStatus.charAt(0).toUpperCase() +
                                tx.licenseStatus.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(
                              Number(tx.createdAt) / 1_000_000,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="View details"
                                onClick={() => openTransactionModal(tx)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete"
                                onClick={() => setDeleteTransactionId(tx.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 text-sm font-medium text-left"
                onClick={() => setShowLegacyLogs(!showLegacyLogs)}
              >
                <span>Legacy Email Logs ({emailLogs?.length ?? 0})</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showLegacyLogs && "rotate-180",
                  )}
                />
              </button>
              {showLegacyLogs && (
                <div className="p-4 space-y-4">
                  {selectedLogKeys.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteLogsConfirm(true)}
                    >
                      Delete Selected ({selectedLogKeys.size})
                    </Button>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            ref={
                              selectAllLogsRef as React.RefObject<HTMLButtonElement>
                            }
                            checked={
                              !!(
                                emailLogs &&
                                emailLogs.length > 0 &&
                                selectedLogKeys.size === emailLogs.length
                              )
                            }
                            onCheckedChange={toggleSelectAllLogs}
                          />
                        </TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!emailLogs || emailLogs.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-4"
                          >
                            No legacy logs
                          </TableCell>
                        </TableRow>
                      ) : (
                        emailLogs.map((log, index) => (
                          <TableRow key={getEmailLogKey(log, index)}>
                            <TableCell>
                              <Checkbox
                                checked={selectedLogKeys.has(
                                  getEmailLogKey(log, index),
                                )}
                                onCheckedChange={() =>
                                  toggleLogSelection(getEmailLogKey(log, index))
                                }
                              />
                            </TableCell>
                            <TableCell>{log.email}</TableCell>
                            <TableCell>{log.subject}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.deliveryStatus === "sent"
                                    ? "default"
                                    : "destructive"
                                }
                                className={
                                  log.deliveryStatus === "sent"
                                    ? "bg-green-500 text-white"
                                    : ""
                                }
                              >
                                {log.deliveryStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(
                                Number(log.sentTimestamp) / 1_000_000,
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-red-500 max-w-[200px] truncate">
                              {log.errorMessage || "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteLogKey(getEmailLogKey(log, index))
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <TransactionModal
              transaction={viewingTransaction}
              open={isTransactionModalOpen}
              onClose={() => setIsTransactionModalOpen(false)}
            />
            <AlertDialog
              open={showBulkDeleteTransactionsConfirm}
              onOpenChange={setShowBulkDeleteTransactionsConfirm}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete Selected Transaction Logs
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete{" "}
                    {selectedTransactionIds.size} transaction log(s)? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDeleteTransactions}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
              open={!!deleteTransactionId}
              onOpenChange={(open) => {
                if (!open) setDeleteTransactionId(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transaction Log</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this transaction log? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (deleteTransactionId)
                        handleDeleteTransaction(deleteTransactionId);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="automation">
            <div className="space-y-6">
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-500">
                  Email System Configuration
                </AlertTitle>
                <AlertDescription className="text-blue-500/90">
                  <p className="mb-2">
                    To enable automated email delivery, complete the following
                    steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Configure RESEND API settings below with your API key and
                      service name
                    </li>
                    <li>
                      Upload a trial license file that will be attached to
                      welcome emails
                    </li>
                    <li>
                      Test the configuration using the connection test button
                    </li>
                  </ol>
                  <p className="mt-2 text-sm">
                    <strong>Note:</strong> The backend uses RESEND API for
                    reliable email delivery via HTTP outcalls. Get your API key
                    from{" "}
                    <a
                      href="https://resend.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      resend.com
                    </a>
                    .
                  </p>
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Email Automation Settings</CardTitle>
                  <CardDescription>
                    Configure automated welcome emails sent when users download
                    the free version
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleEmailSettingsUpdate}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="emailSubject">Email Subject</Label>
                      <Input
                        id="emailSubject"
                        placeholder="Welcome to BAMM - Your 30-Day Trial License"
                        value={emailFormData.emailSubject}
                        onChange={(e) =>
                          setEmailFormData({
                            ...emailFormData,
                            emailSubject: e.target.value,
                          })
                        }
                        disabled={updateEmailSettings.isPending}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emailBody">Email Body</Label>
                      <Textarea
                        id="emailBody"
                        placeholder="Thank you for downloading BAMM! Please find your 30-day trial license attached."
                        value={emailFormData.emailBody}
                        onChange={(e) =>
                          setEmailFormData({
                            ...emailFormData,
                            emailBody: e.target.value,
                          })
                        }
                        disabled={updateEmailSettings.isPending}
                        rows={6}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        The email will include the user's name and email, plus
                        the trial license file attachment
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={updateEmailSettings.isPending}
                    >
                      {updateEmailSettings.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Email Settings"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Server className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>RESEND API Configuration</CardTitle>
                      <CardDescription>
                        Configure RESEND API settings for sending automated
                        emails via HTTP outcalls
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!configStatus?.resendConfigured && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-800 text-sm">
                      ⚠️ RESEND API key is not configured. Email delivery will
                      fail until you save your RESEND API key below.
                    </div>
                  )}
                  {!resendConfig && (
                    <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-yellow-500">
                        <strong>RESEND API Configuration Required:</strong>{" "}
                        Email delivery is currently disabled. Configure your
                        RESEND API settings below to enable automated email
                        sending for trial licenses and premium purchases.
                      </AlertDescription>
                    </Alert>
                  )}

                  {resendConfig && (
                    <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-500">
                        <strong>RESEND API Configured:</strong> Email system is
                        ready with service name "{resendConfig.serviceName}".
                        Make sure your API key is valid and has proper
                        permissions. Check the Email Logs tab for delivery
                        status.
                      </AlertDescription>
                    </Alert>
                  )}

                  <form
                    onSubmit={handleResendConfigUpdate}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="resendApiKey">RESEND API Key</Label>
                      <Input
                        id="resendApiKey"
                        type="password"
                        placeholder="re_..."
                        value={resendFormData.apiKey}
                        onChange={(e) =>
                          setResendFormData({
                            ...resendFormData,
                            apiKey: e.target.value,
                          })
                        }
                        disabled={setResendConfig.isPending}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Your RESEND API key from{" "}
                        <a
                          href="https://resend.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          resend.com/api-keys
                        </a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resendBaseUrl">RESEND API Base URL</Label>
                      <Input
                        id="resendBaseUrl"
                        type="text"
                        placeholder="https://api.resend.com"
                        value={resendFormData.baseUrl}
                        onChange={(e) =>
                          setResendFormData({
                            ...resendFormData,
                            baseUrl: e.target.value,
                          })
                        }
                        disabled={setResendConfig.isPending}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        RESEND API endpoint (default: https://api.resend.com)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resendSenderEmail">
                        Sender Email Address
                      </Label>
                      <Input
                        id="resendSenderEmail"
                        type="email"
                        placeholder="noreply@yourdomain.com"
                        value={resendFormData.senderEmail}
                        onChange={(e) =>
                          setResendFormData({
                            ...resendFormData,
                            senderEmail: e.target.value,
                          })
                        }
                        disabled={setResendConfig.isPending}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Email address that will appear as the sender (must be
                        verified in RESEND)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resendServiceName">Service Name</Label>
                      <Input
                        id="resendServiceName"
                        type="text"
                        placeholder="BAMM_Email"
                        value={resendFormData.serviceName}
                        onChange={(e) =>
                          setResendFormData({
                            ...resendFormData,
                            serviceName: e.target.value,
                          })
                        }
                        disabled={setResendConfig.isPending}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Service identifier for RESEND API operations (e.g.,
                        "BAMM_Email")
                      </p>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Important:</strong> The service name is used to
                        identify your application in RESEND API logs and
                        operations. Make sure your RESEND account is properly
                        configured and your sender email is verified.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={setResendConfig.isPending}
                        className="flex-1"
                      >
                        {setResendConfig.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Server className="mr-2 h-4 w-4" />
                            {resendConfig
                              ? "Update RESEND Configuration"
                              : "Save RESEND Configuration"}
                          </>
                        )}
                      </Button>
                      {resendConfig && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestResendConnection}
                          disabled={testResendConnection.isPending}
                        >
                          {testResendConnection.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>30-Day Trial License File</CardTitle>
                  <CardDescription>
                    Upload the generic trial license file that will be attached
                    to welcome emails
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trialLicenseFile && (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Current License File</p>
                        <p className="text-sm text-muted-foreground">
                          License file is uploaded and ready
                        </p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  )}

                  {!trialLicenseFile && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border-2 border-dashed">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-muted-foreground">
                          No License File
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Upload a trial license file to enable email automation
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="licenseFile">
                      {trialLicenseFile
                        ? "Replace License File"
                        : "Upload License File"}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="licenseFile"
                        type="file"
                        onChange={handleLicenseFileUpload}
                        disabled={isUploading}
                        className="flex-1"
                      />
                      {isUploading && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {uploadProgress}%
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a license file (any format). This file will be
                      attached to all welcome emails.
                    </p>
                  </div>

                  {isUploading && (
                    <Progress value={uploadProgress} className="h-2" />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="licenses">
            {!configStatus?.privateKeyPresent && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-800 text-sm">
                ⚠️ RSA private key is not uploaded. License generation will be
                disabled until you upload your private.pem file below.
              </div>
            )}
            <LicenseGenerationPanel
              licenseRecords={licenseRecords}
              onDeleteLicenseRecord={setDeleteLicenseId}
              isDeletingLicense={deleteLicenseRecord.isPending}
            />
          </TabsContent>

          <TabsContent value="installers">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Download className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Installer File Management</CardTitle>
                    <CardDescription>
                      Upload Mac (.dmg) and Windows (.exe) installer files from
                      BAMM GitHub Releases. Required names:{" "}
                      <code className="text-xs">
                        BAMM-{"{semver}"}-arm64.dmg
                      </code>
                      , <code className="text-xs">BAMM-{"{semver}"}.exe</code>{" "}
                      (desktop tags are independent of storefront{" "}
                      {STOREFRONT_VERSION}).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Mac Installer */}
                  <Card className="border-muted">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <img
                          src="/assets/generated/mac-download-icon.dim_64x64.png"
                          alt="Mac"
                          className="h-10 w-10"
                        />
                        <div>
                          <CardTitle className="text-lg">
                            Mac Installer (.dmg)
                          </CardTitle>
                          <CardDescription>
                            macOS application installer
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {macInstaller ? (
                        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              Desktop{" "}
                              {formatInstallerLabel(
                                parseDesktopInstallerFileName(
                                  macInstaller.fileName,
                                ),
                                macInstaller.fileName,
                              )}
                            </p>
                            <p
                              className="text-sm text-muted-foreground font-mono truncate"
                              title={macInstaller.fileName}
                            >
                              {macInstaller.fileName}
                            </p>
                          </div>
                          <Badge variant="default">Active</Badge>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                          <p className="text-sm text-muted-foreground">
                            No installer uploaded
                          </p>
                        </div>
                      )}

                      <input
                        ref={macFileInputRef}
                        type="file"
                        accept=".dmg"
                        onChange={handleMacInstallerUpload}
                        className="hidden"
                      />

                      {isMacUploading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Uploading...
                            </span>
                            <span className="font-medium">
                              {macUploadProgress}%
                            </span>
                          </div>
                          <Progress value={macUploadProgress} className="h-2" />
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => macFileInputRef.current?.click()}
                        disabled={isMacUploading}
                      >
                        {isMacUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {macInstaller
                              ? "Replace Mac Installer"
                              : "Upload Mac Installer"}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Windows Installer */}
                  <Card className="border-muted">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <img
                          src="/assets/generated/windows-download-icon.dim_64x64.png"
                          alt="Windows"
                          className="h-10 w-10"
                        />
                        <div>
                          <CardTitle className="text-lg">
                            Windows Installer (.exe)
                          </CardTitle>
                          <CardDescription>
                            Windows application installer
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {windowsInstaller ? (
                        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              Desktop{" "}
                              {formatInstallerLabel(
                                parseDesktopInstallerFileName(
                                  windowsInstaller.fileName,
                                ),
                                windowsInstaller.fileName,
                              )}
                            </p>
                            <p
                              className="text-sm text-muted-foreground font-mono truncate"
                              title={windowsInstaller.fileName}
                            >
                              {windowsInstaller.fileName}
                            </p>
                          </div>
                          <Badge variant="default">Active</Badge>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                          <p className="text-sm text-muted-foreground">
                            No installer uploaded
                          </p>
                        </div>
                      )}

                      <input
                        ref={windowsFileInputRef}
                        type="file"
                        accept=".exe"
                        onChange={handleWindowsInstallerUpload}
                        className="hidden"
                      />

                      {isWindowsUploading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Uploading...
                            </span>
                            <span className="font-medium">
                              {windowsUploadProgress}%
                            </span>
                          </div>
                          <Progress
                            value={windowsUploadProgress}
                            className="h-2"
                          />
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => windowsFileInputRef.current?.click()}
                        disabled={isWindowsUploading}
                      >
                        {isWindowsUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {windowsInstaller
                              ? "Replace Windows Installer"
                              : "Upload Windows Installer"}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> Uploaded installer files will be
                    available for download on the Download Success page. Make
                    sure to upload the latest versions of your installers to
                    ensure users get the most up-to-date software.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin-management">
            {isSuperAdmin && (
              <ClaimCodeSection
                claimCode={claimCodeData as string | undefined}
              />
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Admin Management
                </CardTitle>
                {(effectiveRole === "superAdmin" ||
                  effectiveRole === "administrator") && (
                  <Button
                    size="sm"
                    onClick={() => setShowInviteAdmin(true)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Admin
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isLoadingAdmins ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : adminList?.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 text-sm mb-3">
                      RBAC system not initialized. Enter your name and email,
                      then click Initialize to set up admin roles.
                    </p>
                    <div className="space-y-2 mb-3">
                      <Input
                        placeholder="Your name"
                        value={bootstrapName}
                        onChange={(e) => setBootstrapName(e.target.value)}
                        className="bg-white border-yellow-300 text-sm"
                      />
                      <Input
                        placeholder="Your email"
                        type="email"
                        value={bootstrapEmail}
                        onChange={(e) => setBootstrapEmail(e.target.value)}
                        className="bg-white border-yellow-300 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBootstrapSuperAdmin}
                      disabled={!bootstrapName.trim() || !bootstrapEmail.trim()}
                      className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                    >
                      Initialize Admin Roles
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(adminList || []).map((admin) => {
                        const rawRole =
                          admin.role && typeof admin.role === "object"
                            ? Object.keys(admin.role)[0]
                            : String(admin.role);
                        const roleName = roleToString(rawRole);
                        const _isSuperAdmin = rawRole === "superAdmin";
                        const isLowerTier =
                          rawRole === "featuresManager" ||
                          rawRole === "licenseGenerator";
                        return (
                          <TableRow key={admin.id}>
                            <TableCell className="font-medium">
                              {admin.name}
                            </TableCell>
                            <TableCell>{admin.email}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(rawRole)}`}
                              >
                                {roleName}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(String(admin.status))}`}
                              >
                                {String(admin.status)}
                              </span>
                            </TableCell>
                            <TableCell>{admin.invitedBy}</TableCell>
                            <TableCell>
                              {new Date(
                                Number(admin.invitedAt / 1_000_000n),
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {admin.isProtected === true &&
                              (admin.invitedBy === "system" ||
                                admin.id === "super-admin-bootstrap") ? (
                                <span className="text-xs text-gray-400 font-medium">
                                  Protected
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {effectiveRole === "superAdmin" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7"
                                      onClick={() => {
                                        setEditingAdminEmail(admin.email);
                                        setEditingAdminRole(rawRole);
                                      }}
                                    >
                                      Edit Role
                                    </Button>
                                  )}
                                  {isSuperAdmin &&
                                    !admin.isProtected &&
                                    String(admin.status) === "active" &&
                                    rawRole !== "superAdmin" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs h-7"
                                        onClick={() => {
                                          setElevatingAdmin({
                                            id: admin.id,
                                            email: admin.email,
                                            name: admin.name,
                                            role: rawRole,
                                            isProtected: admin.isProtected,
                                            status: String(admin.status),
                                          });
                                          setElevateTargetRole("");
                                          setElevateError("");
                                          setElevateSuccess("");
                                          setShowElevateDialog(true);
                                        }}
                                      >
                                        Elevate Role
                                      </Button>
                                    )}
                                  {(effectiveRole === "superAdmin" ||
                                    (effectiveRole === "administrator" &&
                                      isLowerTier)) &&
                                    (String(admin.status) === "active" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 text-amber-600 border-amber-300"
                                        onClick={() =>
                                          handleDeactivateAdmin(admin.email)
                                        }
                                      >
                                        Deactivate
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 text-green-600 border-green-300"
                                        onClick={() =>
                                          handleReactivateAdmin(admin.email)
                                        }
                                      >
                                        Reactivate
                                      </Button>
                                    ))}
                                  {effectiveRole === "superAdmin" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 text-red-600 border-red-300"
                                      onClick={() =>
                                        setDeleteAdminEmail(admin.email)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="audit-log">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Audit Log
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadAuditLog}
                  className="flex items-center gap-2"
                >
                  Download Audit Log (.json)
                </Button>
              </CardHeader>
              <CardContent>
                {!auditLog || auditLog.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    No audit log entries yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const grouped = (auditLog || []).reduce<
                                Record<string, any[]>
                              >((acc, entry) => {
                                const key = entry.actorEmail || "unknown";
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(entry);
                                return acc;
                              }, {});
                              if (e.target.checked) {
                                setSelectedAuditEmails(
                                  new Set(Object.keys(grouped)),
                                );
                              } else {
                                setSelectedAuditEmails(new Set());
                              }
                            }}
                            checked={(() => {
                              const grouped = (auditLog || []).reduce<
                                Record<string, any[]>
                              >((acc, entry) => {
                                const key = entry.actorEmail || "unknown";
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(entry);
                                return acc;
                              }, {});
                              const keys = Object.keys(grouped);
                              return (
                                keys.length > 0 &&
                                keys.every((k) => selectedAuditEmails.has(k))
                              );
                            })()}
                          />
                        </TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const grouped = (auditLog || []).reduce<
                          Record<string, any[]>
                        >((acc, entry) => {
                          const key = entry.actorEmail || "unknown";
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(entry);
                          return acc;
                        }, {});
                        return Object.entries(grouped).map(
                          ([email, events]) => {
                            const lastEvent = events.reduce(
                              (latest, ev) =>
                                ev.timestamp > latest.timestamp ? ev : latest,
                              events[0],
                            );
                            const role = lastEvent.actorRole || "—";
                            return (
                              <TableRow key={email}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedAuditEmails.has(email)}
                                    onChange={(e) => {
                                      const next = new Set(selectedAuditEmails);
                                      if (e.target.checked) next.add(email);
                                      else next.delete(email);
                                      setSelectedAuditEmails(next);
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-xs">
                                  {email}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {role}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {events.length}
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
                                  {new Date(
                                    Number(lastEvent.timestamp / 1_000_000n),
                                  ).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setSelectedAuditUser({
                                        email,
                                        role,
                                        events,
                                      })
                                    }
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          },
                        );
                      })()}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Audit Log User Detail Dialog */}
      <Dialog
        open={!!selectedAuditUser}
        onOpenChange={(open) => !open && setSelectedAuditUser(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log — {selectedAuditUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium">{selectedAuditUser?.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="font-medium">
                  {selectedAuditUser?.events.length}
                </p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selectedAuditUser?.events || []).map((entry, idx) => (
                  <TableRow key={String(entry.id) || String(idx)}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(
                        Number(entry.timestamp / 1_000_000n),
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {entry.action}
                    </TableCell>
                    <TableCell className="text-xs">{entry.target}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (!selectedAuditUser) return;
                const payload = {
                  adminEmail: selectedAuditUser.email,
                  role: selectedAuditUser.role,
                  exportedAt: new Date().toISOString(),
                  events: selectedAuditUser.events,
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `BAMM-AuditLog-${selectedAuditUser.email}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Audit Log (.json)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Submission Confirmation Dialog */}
      <AlertDialog
        open={!!deleteSubmissionEmail}
        onOpenChange={(open) => !open && setDeleteSubmissionEmail(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the submission for{" "}
              <strong>{deleteSubmissionEmail}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserSubmission.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteSubmissionEmail &&
                handleDeleteUserSubmission(deleteSubmissionEmail)
              }
              disabled={deleteUserSubmission.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserSubmission.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Email Log Confirmation Dialog */}
      <AlertDialog
        open={!!deleteLogKey}
        onOpenChange={(open) => !open && setDeleteLogKey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this email log entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEmailLog.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLogKey && handleDeleteEmailLog(deleteLogKey)}
              disabled={deleteEmailLog.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmailLog.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Email Logs Confirmation Dialog */}
      <AlertDialog
        open={showBulkDeleteLogsConfirm}
        onOpenChange={setShowBulkDeleteLogsConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Logs</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {selectedLogKeys.size} selected log
              {selectedLogKeys.size !== 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowBulkDeleteLogsConfirm(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBulkDeleteLogs}
              disabled={bulkDeleteEmailLogs.isPending}
            >
              {bulkDeleteEmailLogs.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Purchase Record Confirmation Dialog */}
      <AlertDialog
        open={!!deletePurchaseId}
        onOpenChange={(open) => !open && setDeletePurchaseId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase record? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePurchase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Purchase Records Confirmation Dialog */}
      <AlertDialog
        open={showBulkDeletePurchasesConfirm}
        onOpenChange={setShowBulkDeletePurchasesConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Selected Purchase Records
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete {selectedPurchaseIds.size} purchase record
              {selectedPurchaseIds.size !== 1 ? "s" : ""}? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDeletePurchases}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete License Record Confirmation Dialog */}
      <AlertDialog
        open={!!deleteLicenseId}
        onOpenChange={(open) => !open && setDeleteLicenseId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete License Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this license record? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLicenseRecord.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteLicenseId && handleDeleteLicenseRecord(deleteLicenseId)
              }
              disabled={deleteLicenseRecord.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLicenseRecord.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Admin Dialog */}
      <Dialog open={showInviteAdmin} onOpenChange={setShowInviteAdmin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium text-foreground block mb-1">
                Name
              </p>
              <Input
                value={inviteForm.name}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground block mb-1">
                Email
              </p>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground block mb-1">
                Role
              </p>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {effectiveRole === "superAdmin" && (
                    <SelectItem value="superAdmin">Super Admin</SelectItem>
                  )}
                  {effectiveRole === "superAdmin" && (
                    <SelectItem value="administrator">Administrator</SelectItem>
                  )}
                  <SelectItem value="featuresManager">
                    Features Manager
                  </SelectItem>
                  <SelectItem value="licenseGenerator">
                    License Generator
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowInviteAdmin(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteAdmin}
                disabled={inviteAdmin.isPending}
              >
                {inviteAdmin.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {inviteAdmin.isPending ? "Sending..." : "Send Invite"}
              </Button>
              {inviteAdmin.isPending && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Sending invitation email...
                </p>
              )}
            </div>
            {inviteEmailStatus && (
              <div
                className={
                  inviteEmailStatus.type === "success"
                    ? "mt-3 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm"
                    : "mt-3 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm"
                }
              >
                {inviteEmailStatus.message}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Admin Role Dialog */}
      <Dialog
        open={!!editingAdminEmail}
        onOpenChange={(open) => {
          if (!open) setEditingAdminEmail("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium text-foreground block mb-1">
                New Role for {editingAdminEmail}
              </p>
              <Select
                value={editingAdminRole}
                onValueChange={(v) => setEditingAdminRole(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {effectiveRole === "superAdmin" && (
                    <SelectItem value="superAdmin">Super Admin</SelectItem>
                  )}
                  <SelectItem value="administrator">Administrator</SelectItem>
                  <SelectItem value="featuresManager">
                    Features Manager
                  </SelectItem>
                  <SelectItem value="licenseGenerator">
                    License Generator
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingAdminEmail("")}
              >
                Cancel
              </Button>
              <Button onClick={() => handleUpdateAdminRole()}>Save Role</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Elevate Admin Role Dialog */}
      <Dialog
        open={showElevateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowElevateDialog(false);
            setElevatingAdmin(null);
            setElevateTargetRole("");
            setElevateError("");
            setElevateSuccess("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elevate Admin Role</DialogTitle>
            <DialogDescription>
              Promote {elevatingAdmin?.name || elevatingAdmin?.email} to a
              higher role. An activation email will be sent and they will need
              to re-authenticate to activate their new role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Current Role</p>
              <div className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(elevatingAdmin?.role ?? "")}`}
                >
                  {roleToString(elevatingAdmin?.role ?? "")}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">New Role</p>
              <Select
                value={elevateTargetRole}
                onValueChange={setElevateTargetRole}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new role..." />
                </SelectTrigger>
                <SelectContent>
                  {elevatingAdmin?.role === "licenseGenerator" && (
                    <>
                      <SelectItem value="featuresManager">
                        Features Manager
                      </SelectItem>
                      <SelectItem value="administrator">
                        Administrator
                      </SelectItem>
                      <SelectItem value="superAdmin">Super Admin</SelectItem>
                    </>
                  )}
                  {elevatingAdmin?.role === "featuresManager" && (
                    <>
                      <SelectItem value="administrator">
                        Administrator
                      </SelectItem>
                      <SelectItem value="superAdmin">Super Admin</SelectItem>
                    </>
                  )}
                  {elevatingAdmin?.role === "administrator" && (
                    <SelectItem value="superAdmin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {elevateError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {elevateError}
              </div>
            )}
            {elevateSuccess && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                {elevateSuccess}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowElevateDialog(false)}
              disabled={elevateLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleElevateRole}
              disabled={!elevateTargetRole || elevateLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {elevateLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Sending Email...
                </span>
              ) : (
                "Send Elevation Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Admin Confirmation */}
      <AlertDialog
        open={!!deleteAdminEmail}
        onOpenChange={(open) => {
          if (!open) setDeleteAdminEmail("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the admin account for{" "}
              <strong>{deleteAdminEmail}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAdminEmail("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteAdminEmail) handleDeleteAdmin(deleteAdminEmail);
                setDeleteAdminEmail("");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
