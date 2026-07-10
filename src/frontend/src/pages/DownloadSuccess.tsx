import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatInstallerLabel,
  parseDesktopInstallerFileName,
} from "@/lib/versions";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Mail,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useDownloadMacInstaller,
  useDownloadWindowsInstaller,
  useGetInstallerFileNames,
  useIncrementDownloadCount,
  useIssueTrialLicenseAndEmail,
} from "../hooks/useQueries";
import {
  DOWNLOAD_CARD_DESCRIPTION,
  DOWNLOAD_CARD_TITLE,
  DOWNLOAD_SUCCESS_NEW_HEADLINE,
  DOWNLOAD_SUCCESS_NEW_SUBHEAD,
  DOWNLOAD_SUCCESS_RETURNING_HEADLINE,
  DOWNLOAD_SUCCESS_RETURNING_SUBHEAD,
  DOWNLOAD_SUCCESS_TRIAL_ALERT,
} from "../legal/marketing";

export default function DownloadSuccess() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    email?: string;
    name?: string;
    returning?: string;
    new?: string;
  };
  const incrementDownload = useIncrementDownloadCount();
  const downloadMac = useDownloadMacInstaller();
  const downloadWindows = useDownloadWindowsInstaller();
  const { data: installerNames } = useGetInstallerFileNames();
  const issueTrialLicense = useIssueTrialLicenseAndEmail();
  const [downloadingPlatform, setDownloadingPlatform] = useState<
    "mac" | "windows" | null
  >(null);
  const licenseAlreadySentRef = useRef(false);
  const [, setLicenseError] = useState<string | null>(null);

  const macInstallerInfo = parseDesktopInstallerFileName(
    installerNames?.macFileName,
  );
  const windowsInstallerInfo = parseDesktopInstallerFileName(
    installerNames?.windowsFileName,
  );

  const isReturningUser = search.returning === "true";
  const isNewUser = search.new === "true";

  useEffect(() => {
    if (licenseAlreadySentRef.current) return;
    if (!isNewUser || isReturningUser || !search.email) return;

    const sendLicense = async () => {
      licenseAlreadySentRef.current = true;
      try {
        await issueTrialLicense.mutateAsync({
          name: search.name || "BAMM User",
          email: search.email!,
        });
        toast.success("Trial license generated and sent successfully");
      } catch (err: unknown) {
        console.error("Trial license send error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to send trial license";
        setLicenseError(errorMsg);
        toast.error(errorMsg);
        licenseAlreadySentRef.current = false;
      }
    };

    sendLicense();
  }, [
    isNewUser,
    isReturningUser,
    search.email,
    search.name,
    issueTrialLicense,
  ]);

  if (!search.email) {
    navigate({ to: "/" });
    return null;
  }

  const handleDownload = async (platform: "mac" | "windows") => {
    setDownloadingPlatform(platform);

    try {
      if (search.email) {
        try {
          await incrementDownload.mutateAsync(search.email);
        } catch (error) {
          console.error("Failed to increment download count:", error);
        }
      }

      const result =
        platform === "mac"
          ? await downloadMac.mutateAsync()
          : await downloadWindows.mutateAsync();

      if (result.__kind__ === "ok") {
        const bytes = await result.ok.file.getBytes();
        const blob = new Blob([bytes], { type: result.ok.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.ok.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        const installerInfo = parseDesktopInstallerFileName(result.ok.fileName);
        const versionLabel = formatInstallerLabel(
          installerInfo,
          result.ok.fileName,
        );
        toast.success(
          `${platform === "mac" ? "Mac" : "Windows"} ${versionLabel} download started`,
        );
      } else {
        toast.error(result.err || "Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download installer");
    } finally {
      setDownloadingPlatform(null);
    }
  };

  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">
            {isReturningUser
              ? DOWNLOAD_SUCCESS_RETURNING_HEADLINE
              : DOWNLOAD_SUCCESS_NEW_HEADLINE}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isReturningUser
              ? DOWNLOAD_SUCCESS_RETURNING_SUBHEAD
              : DOWNLOAD_SUCCESS_NEW_SUBHEAD}
          </p>
        </div>

        {isNewUser && !isReturningUser && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Check <strong>{search.email}</strong> for your trial license.{" "}
              {DOWNLOAD_SUCCESS_TRIAL_ALERT}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{DOWNLOAD_CARD_TITLE}</CardTitle>
            <CardDescription>{DOWNLOAD_CARD_DESCRIPTION}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleDownload("mac")}
              disabled={downloadingPlatform !== null}
            >
              {downloadingPlatform === "mac" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download for Mac
              {macInstallerInfo
                ? ` (${formatInstallerLabel(macInstallerInfo)})`
                : ""}
            </Button>
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              onClick={() => handleDownload("windows")}
              disabled={downloadingPlatform !== null}
            >
              {downloadingPlatform === "windows" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download for Windows
              {windowsInstallerInfo
                ? ` (${formatInstallerLabel(windowsInstallerInfo)})`
                : ""}
            </Button>
          </CardContent>
        </Card>

        {issueTrialLicense.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {issueTrialLicense.error instanceof Error
                ? issueTrialLicense.error.message
                : "Failed to send trial license. Please contact support."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
