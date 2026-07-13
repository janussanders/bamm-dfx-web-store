import type { LicenseRecord } from "@/backend";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertCircle,
  CheckCircle2,
  Download,
  Key,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useBulkDeleteLicenseRecords,
  useGenerateLicense,
  useGetConfigurationStatus,
  useGetLicenseFeatures,
  useSendManualLicense,
  useUploadPrivateKeyPem,
} from "../hooks/useQueries";
import { validatePrivateKeyPEM } from "../lib/rsaUtils";

interface LicenseGenerationPanelProps {
  licenseRecords?: LicenseRecord[];
  onDeleteLicenseRecord?: (licenseId: string) => void;
  isDeletingLicense?: boolean;
}

export default function LicenseGenerationPanel({
  licenseRecords,
  onDeleteLicenseRecord,
  isDeletingLicense = false,
}: LicenseGenerationPanelProps) {
  const { data: configStatus } = useGetConfigurationStatus();
  const uploadPrivateKeyPem = useUploadPrivateKeyPem();
  const generateLicense = useGenerateLicense();
  const sendManualLicense = useSendManualLicense();
  // getLicenseFeatures() returns ALL license features — license generation uses premium only
  // (core/free marketing rows stay out of checkout / RSA feature pickers)
  const {
    data: licenseFeatures,
    isLoading: featuresLoading,
    isError: featuresError,
    error: featuresErrorObj,
    refetch: refetchFeatures,
    isFetching: featuresRefetching,
  } = useGetLicenseFeatures();
  // Active premium features drive the admin selection panel
  const activeProducts =
    licenseFeatures?.filter((f) => f.isActive && f.isPremium) ?? [];

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");
  const [validationMessage, setValidationMessage] = useState("");

  // Manual Send License Form State
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Standard License Generation Form State
  const [stdRecipientEmail, setStdRecipientEmail] = useState("");
  const [stdSelectedFeatures, setStdSelectedFeatures] = useState<string[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<
    "download" | "email" | "both"
  >("download");
  const [generatedLicense, setGeneratedLicense] = useState<string | null>(null);
  const [isSigningLocally, setIsSigningLocally] = useState(false);

  // Bulk delete license records state
  const [selectedLicenseIds, setSelectedLicenseIds] = useState<string[]>([]);
  const [showBulkDeleteLicensesConfirm, setShowBulkDeleteLicensesConfirm] =
    useState(false);
  const bulkDeleteLicenseRecords = useBulkDeleteLicenseRecords();
  const selectAllLicensesRef = useRef<HTMLInputElement>(null);
  const privateKeyReady = configStatus?.privateKeyPresent ?? false;

  const handlePrivateKeyUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setKeyValidationStatus("validating");
      setValidationMessage("Validating private key...");

      const text = await file.text();

      const validation = validatePrivateKeyPEM(text);
      if (!validation.valid) {
        setKeyValidationStatus("invalid");
        setValidationMessage(validation.error || "Invalid private key format");
        toast.error(validation.error || "Invalid private key format");
        return;
      }

      setUploadProgress(50);
      await uploadPrivateKeyPem.mutateAsync(text);
      setKeyValidationStatus("valid");
      setValidationMessage("Private key stored for server-side signing.");
      toast.success("Private key uploaded successfully");
      setUploadProgress(100);
    } catch (error) {
      console.error("Private key upload error:", error);
      setKeyValidationStatus("invalid");
      setValidationMessage("Failed to upload private key");
      toast.error("Failed to upload private key");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleFeatureToggle = (featureName: string, checked: boolean) => {
    setSelectedFeatures((prev) =>
      checked ? [...prev, featureName] : prev.filter((n) => n !== featureName),
    );
  };

  const handleStdFeatureToggle = (featureName: string, checked: boolean) => {
    setStdSelectedFeatures((prev) =>
      checked ? [...prev, featureName] : prev.filter((n) => n !== featureName),
    );
  };

  const handleManualSendLicense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!privateKeyReady) {
      toast.error("Upload the RSA private key before sending licenses");
      return;
    }

    if (selectedFeatures.length === 0) {
      toast.error("Please select at least one premium feature");
      return;
    }

    if (!recipientName.trim()) {
      toast.error("Please enter recipient name");
      return;
    }

    if (!recipientEmail.trim() || !recipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email");
      return;
    }

    try {
      setIsSigningLocally(true);
      await sendManualLicense.mutateAsync({
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
        selectedFeatures,
      });
      toast.success("License signed and sent successfully");
      setRecipientName("");
      setRecipientEmail("");
      setSelectedFeatures([]);
    } catch (error: unknown) {
      console.error("Manual license send error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send license",
      );
    } finally {
      setIsSigningLocally(false);
    }
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!privateKeyReady) {
      toast.error("Upload the RSA private key before generating licenses");
      return;
    }

    if (stdSelectedFeatures.length === 0) {
      toast.error("Please select at least one feature");
      return;
    }

    if (!stdRecipientEmail.trim() || !stdRecipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email");
      return;
    }

    // Candid still requires expirationDate; backend ignores it and uses the
    // entitlement activation window (30 days) + post-activation term.
    const candidExpirationPlaceholder = Date.now() + 30 * 24 * 60 * 60 * 1000;

    try {
      setIsSigningLocally(true);
      const licenseJson = await generateLicense.mutateAsync({
        recipientEmail: stdRecipientEmail.trim(),
        features: stdSelectedFeatures,
        expirationDate: BigInt(candidExpirationPlaceholder * 1_000_000),
        deliveryMethod,
      });
      setGeneratedLicense(licenseJson);
      toast.success("v2 grace license generated (30-day activation window)");
      if (deliveryMethod === "email" || deliveryMethod === "both") {
        toast.success("License emailed to recipient");
      }
    } catch (error: unknown) {
      console.error("License generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate license",
      );
    } finally {
      setIsSigningLocally(false);
    }
  };

  const handleDownloadLicense = () => {
    if (!generatedLicense) return;

    const blob = new Blob([generatedLicense], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bamm-license-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("License downloaded");
  };

  const handleResetStdForm = () => {
    setStdSelectedFeatures([]);
    setStdRecipientEmail("");
    setDeliveryMethod("download");
    setGeneratedLicense(null);
  };

  const handleRefreshFeatures = async () => {
    try {
      await refetchFeatures();
      toast.success("Premium features refreshed successfully");
    } catch (error: unknown) {
      console.error("Feature refresh error:", error);
      toast.error("Failed to refresh features");
    }
  };

  const getLicenseRecordKey = (record: LicenseRecord) => {
    return `${record.recipientEmail}-${record.generatedTimestamp}`;
  };

  const formatPrice = (priceInCents: bigint) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(priceInCents) / 100);
  };

  const calculateTotalValue = (featureNames: string[]) => {
    return featureNames.reduce((sum, name) => {
      const product = activeProducts.find((p) => p.name === name);
      return sum + (product ? product.priceInCents : BigInt(0));
    }, BigInt(0));
  };

  const isLoadingFeatures = featuresLoading || featuresRefetching;

  const allLicenseIds = licenseRecords
    ? licenseRecords.map((r) => getLicenseRecordKey(r))
    : [];
  const allLicensesSelected =
    allLicenseIds.length > 0 &&
    allLicenseIds.every((id) => selectedLicenseIds.includes(id));
  const someLicensesSelected =
    selectedLicenseIds.length > 0 && !allLicensesSelected;

  const toggleLicenseId = (id: string) => {
    setSelectedLicenseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const toggleAllLicenses = () => {
    if (allLicensesSelected) {
      setSelectedLicenseIds([]);
    } else {
      setSelectedLicenseIds(allLicenseIds);
    }
  };
  const handleBulkDeleteLicenses = () => {
    bulkDeleteLicenseRecords.mutate(selectedLicenseIds, {
      onSuccess: () => {
        setSelectedLicenseIds([]);
        setShowBulkDeleteLicensesConfirm(false);
      },
    });
  };

  useEffect(() => {
    if (selectAllLicensesRef.current) {
      selectAllLicensesRef.current.indeterminate = someLicensesSelected;
    }
  }, [someLicensesSelected]);

  const renderFeatureSelection = (
    selectedFeatures: string[],
    onToggle: (featureName: string, checked: boolean) => void,
    disabled: boolean,
  ) => {
    if (isLoadingFeatures) {
      return (
        <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading active products from backend...
          </span>
        </div>
      );
    }

    if (featuresError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">
                Failed to load products from backend
              </p>
              <p className="text-sm">
                {featuresErrorObj?.message || "Unable to fetch active products"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshFeatures}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (activeProducts.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">No active products available</p>
              <p className="text-sm">
                Add products and mark them as Active in the Products tab to
                enable license generation.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshFeatures}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Products
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <>
        <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
          {activeProducts.map((product) => {
            const isSelected = selectedFeatures.includes(product.name);
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`${product.id}-${disabled ? "std" : "manual"}`}
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    onToggle(product.name, checked as boolean)
                  }
                  disabled={disabled}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`${product.id}-${disabled ? "std" : "manual"}`}
                    className="font-medium cursor-pointer block"
                  >
                    {product.name}
                  </Label>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {product.description}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                  {formatPrice(product.priceInCents)}
                </span>
              </div>
            );
          })}
        </div>

        {selectedFeatures.length > 0 && (
          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Total License Value ({selectedFeatures.length} feature
                {selectedFeatures.length !== 1 ? "s" : ""} selected)
              </span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(calculateTotalValue(selectedFeatures))}
              </span>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Private Key Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img
              src="/assets/generated/rsa-key-icon-transparent.dim_64x64.png"
              alt=""
              className="h-6 w-6"
            />
            RSA Private Key
          </CardTitle>
          <CardDescription>
            Upload your RSA private key (private.pem) to enable license
            generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {privateKeyReady && keyValidationStatus === "valid" && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                Private key is uploaded and validated. Ready to generate
                licenses.
              </AlertDescription>
            </Alert>
          )}

          {keyValidationStatus === "invalid" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationMessage}</AlertDescription>
            </Alert>
          )}

          {!privateKeyReady && keyValidationStatus !== "validating" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No private key uploaded. Please upload a valid RSA private key
                in PEM format.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="privateKey">
              {privateKeyReady
                ? "Replace Private Key"
                : "Upload Private Key (private.pem)"}
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="privateKey"
                type="file"
                accept=".pem"
                onChange={handlePrivateKeyUpload}
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
          </div>
        </CardContent>
      </Card>

      {/* License Management Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <img
                  src="/assets/generated/license-icon-transparent.dim_64x64.png"
                  alt=""
                  className="h-6 w-6"
                />
                License Management
              </CardTitle>
              <CardDescription>
                Issues networked v2 grace licenses (
                <code className="text-xs">schema_version: 2</code>) with
                entitlement registry rows — same contract as Stripe fulfillment.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshFeatures}
              disabled={isLoadingFeatures}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoadingFeatures ? "animate-spin" : ""}`}
              />
              Refresh Features
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">
                <Send className="h-4 w-4 mr-2" />
                Manual Send License
              </TabsTrigger>
              <TabsTrigger value="generate">
                <Key className="h-4 w-4 mr-2" />
                Generate License
              </TabsTrigger>
            </TabsList>

            {/* Manual Send License Tab */}
            <TabsContent value="manual" className="space-y-6">
              <Alert className="border-primary/50 bg-primary/5">
                <Mail className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong>Manual License Sending (v2):</strong> Creates a
                  networked entitlement, emails an RSA-signed{" "}
                  <code className="text-xs">schema_version: 2</code> grace
                  license, and starts a 30-day activation window. Desktop shows{" "}
                  <code className="text-xs">phase: grace</code> until the
                  customer activates on a machine.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleManualSendLicense} className="space-y-6">
                {/* Recipient Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Recipient Name *</Label>
                    <Input
                      id="recipientName"
                      type="text"
                      placeholder="John Doe"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      disabled={!privateKeyReady || sendManualLicense.isPending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualRecipientEmail">
                      Recipient Email *
                    </Label>
                    <Input
                      id="manualRecipientEmail"
                      type="email"
                      placeholder="customer@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      disabled={!privateKeyReady || sendManualLicense.isPending}
                      required
                    />
                  </div>
                </div>

                {/* Feature Selection */}
                <div className="space-y-3">
                  <Label>Select Premium Features *</Label>
                  {renderFeatureSelection(
                    selectedFeatures,
                    handleFeatureToggle,
                    !privateKeyReady || sendManualLicense.isPending,
                  )}
                </div>

                {/* Send Button */}
                <Button
                  type="submit"
                  disabled={
                    !privateKeyReady ||
                    sendManualLicense.isPending ||
                    selectedFeatures.length === 0 ||
                    isLoadingFeatures
                  }
                  className="w-full"
                  size="lg"
                >
                  {sendManualLicense.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating and Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Generate & Send License via Email
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Standard Generate License Tab */}
            <TabsContent value="generate" className="space-y-6">
              <Alert className="border-primary/50 bg-primary/5">
                <Key className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong>Generate License (v2):</strong> Creates/merges a
                  networked entitlement and signs a{" "}
                  <code className="text-xs">schema_version: 2</code> grace
                  license. Optional email uses the same activation copy as
                  Stripe fulfillment.
                </AlertDescription>
              </Alert>
              <form onSubmit={handleGenerateLicense} className="space-y-6">
                {/* Feature Selection */}
                <div className="space-y-3">
                  <Label>Premium Features</Label>
                  {renderFeatureSelection(
                    stdSelectedFeatures,
                    handleStdFeatureToggle,
                    !privateKeyReady || generateLicense.isPending,
                  )}
                </div>

                {/* Recipient Email */}
                <div className="space-y-2">
                  <Label htmlFor="stdRecipientEmail">Recipient Email</Label>
                  <Input
                    id="stdRecipientEmail"
                    type="email"
                    placeholder="customer@example.com"
                    value={stdRecipientEmail}
                    onChange={(e) => setStdRecipientEmail(e.target.value)}
                    disabled={!privateKeyReady || generateLicense.isPending}
                    required
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  Term: 30-day activation grace, then full year after desktop
                  activation (same as Stripe fulfillment).
                </p>

                {/* Delivery Method */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryMethod">Delivery Method</Label>
                  <Select
                    value={deliveryMethod}
                    onValueChange={(value) =>
                      setDeliveryMethod(value as "download" | "email" | "both")
                    }
                    disabled={!privateKeyReady || generateLicense.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="download">Download Only</SelectItem>
                      <SelectItem value="email">Email Only</SelectItem>
                      <SelectItem value="both">Download & Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={
                      !privateKeyReady ||
                      generateLicense.isPending ||
                      isSigningLocally ||
                      stdSelectedFeatures.length === 0 ||
                      isLoadingFeatures
                    }
                    className="flex-1"
                  >
                    {generateLicense.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        {isSigningLocally
                          ? "Signing locally..."
                          : "Generate License"}
                      </>
                    )}
                  </Button>
                  {generatedLicense && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetStdForm}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>

              {/* Generated License Display */}
              {generatedLicense && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Generated License</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadLicense}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                  <Textarea
                    value={generatedLicense}
                    readOnly
                    rows={8}
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* License Records */}
      <Card>
        <CardHeader>
          <CardTitle>License Records</CardTitle>
          <CardDescription>
            History of generated and sent licenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedLicenseIds.length > 0 && (
            <div className="mb-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteLicensesConfirm(true)}
              >
                Delete Selected ({selectedLicenseIds.length})
              </Button>
            </div>
          )}
          {licenseRecords && licenseRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 px-2">
                      <input
                        type="checkbox"
                        ref={selectAllLicensesRef}
                        checked={allLicensesSelected}
                        onChange={toggleAllLicenses}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenseRecords.map((record) => (
                    <TableRow key={getLicenseRecordKey(record)}>
                      <TableCell className="w-10 px-2">
                        <input
                          type="checkbox"
                          checked={selectedLicenseIds.includes(
                            getLicenseRecordKey(record),
                          )}
                          onChange={() =>
                            toggleLicenseId(getLicenseRecordKey(record))
                          }
                          className="h-4 w-4 rounded border-gray-600 bg-gray-800 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.recipientEmail}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {record.features.map((featureId) => (
                            <Badge
                              key={featureId}
                              variant="outline"
                              className="text-xs"
                            >
                              {featureId.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(
                          Number(record.expirationDate) / 1000000,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.deliveryStatus === "sent"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {record.deliveryStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(
                          Number(record.generatedTimestamp) / 1000000,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {onDeleteLicenseRecord && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onDeleteLicenseRecord(getLicenseRecordKey(record))
                            }
                            disabled={isDeletingLicense}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No licenses generated yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={showBulkDeleteLicensesConfirm}
        onOpenChange={setShowBulkDeleteLicensesConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected License Records</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {selectedLicenseIds.length} selected license record
              {selectedLicenseIds.length !== 1 ? "s" : ""}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowBulkDeleteLicensesConfirm(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBulkDeleteLicenses}
              disabled={bulkDeleteLicenseRecords.isPending}
            >
              {bulkDeleteLicenseRecords.isPending ? (
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
    </div>
  );
}
