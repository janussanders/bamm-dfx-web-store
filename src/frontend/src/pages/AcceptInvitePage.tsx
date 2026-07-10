import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@/hooks/useActor";
import { useMutationClaimAdminInvite } from "@/hooks/useQueries";
import { Link } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { SUPPORT_EMAIL } from "../legal/copy";
import { LEGAL_ENTITY_DISPLAY } from "../legal/marketing";

export default function AcceptInvitePage() {
  const search = useSearch({ from: "/admin/accept-invite" });
  const [email, setEmail] = useState(
    (search as { email?: string }).email ?? "",
  );
  const [tempPassword, setTempPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isElevating, setIsElevating] = useState(false);

  const { actor } = useActor();
  const claimInvite = useMutationClaimAdminInvite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !tempPassword.trim()) {
      setErrorMsg("Please enter both email and temporary password.");
      return;
    }

    try {
      await claimInvite.mutateAsync({
        email: email.trim(),
        tempPassword: tempPassword.trim(),
      });
      setSuccessMessage("");
      setSuccess(true);
    } catch (inviteErr) {
      // Fallback: try role elevation claim
      try {
        setIsElevating(true);
        const result = await (
          actor as unknown as {
            claimRoleElevation: (
              tempPassword: string,
            ) => Promise<{ ok: string } | { err: string }>;
          }
        ).claimRoleElevation(tempPassword.trim());
        setIsElevating(false);
        if ("ok" in result) {
          setSuccessMessage(
            "Role elevated successfully. Your new role is now active. Please sign in again to access your updated permissions.",
          );
          setSuccess(true);
        } else {
          const inviteMsg =
            inviteErr instanceof Error
              ? inviteErr.message
              : "Failed to claim invite.";
          setErrorMsg(`${inviteMsg} Role elevation also failed: ${result.err}`);
        }
      } catch (elevationErr) {
        setIsElevating(false);
        const inviteMsg =
          inviteErr instanceof Error
            ? inviteErr.message
            : "Failed to claim invite.";
        const elevMsg =
          elevationErr instanceof Error
            ? elevationErr.message
            : "Failed to claim role elevation.";
        setErrorMsg(`${inviteMsg} Role elevation also failed: ${elevMsg}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {LEGAL_ENTITY_DISPLAY}
          </h1>
          <p className="text-muted-foreground text-sm">
            Admin Portal — Accept Invitation
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Accept Admin Invitation</CardTitle>
            <CardDescription>
              Enter your email address and the temporary password from your
              invitation email to activate your admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <h3 className="font-semibold text-lg">
                    {successMessage ? "Role Elevated" : "Admin Access Granted"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {successMessage ||
                      "Your admin account has been activated. You can now log in to the admin panel with your Internet Identity."}
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link to="/admin">Go to Admin Panel</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMsg}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="accept-email">Email Address</Label>
                  <Input
                    id="accept-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={claimInvite.isPending}
                    required
                    data-ocid="accept-invite.email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accept-temp-password">
                    Temporary Password
                  </Label>
                  <Input
                    id="accept-temp-password"
                    type="password"
                    placeholder="Enter temporary password from email"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    disabled={claimInvite.isPending}
                    required
                    data-ocid="accept-invite.temp_password"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the one-time password included in your invitation
                    email. It expires after 24 hours.
                  </p>
                </div>

                <Alert className="border-blue-500/30 bg-blue-500/5">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs">
                    Make sure you are logged in with Internet Identity before
                    submitting — your principal will be linked to this admin
                    account.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={claimInvite.isPending || isElevating}
                  data-ocid="accept-invite.submit_button"
                >
                  {claimInvite.isPending || isElevating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isElevating
                        ? "Elevating Role..."
                        : "Activating Account..."}
                    </>
                  ) : (
                    "Activate Admin Account"
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Need help?{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="underline hover:text-foreground"
                  >
                    Contact support
                  </a>
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {LEGAL_ENTITY_DISPLAY} — Admin Portal
        </p>
      </div>
    </div>
  );
}
