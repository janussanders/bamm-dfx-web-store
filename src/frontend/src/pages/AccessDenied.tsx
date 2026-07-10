import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCheckAnyPendingInvite } from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Mail, ShieldAlert } from "lucide-react";
import { SocialLoginButtons } from "../components/SocialLoginButtons";

export default function AccessDenied() {
  const navigate = useNavigate();
  const { isAuthenticated, login, isLoggingIn } = useInternetIdentity();
  const { data: pendingInvite } = useCheckAnyPendingInvite();
  // const search = useSearch({ from: "/access-denied" });

  const handleLogin = () => {
    login();
  };

  const handleActivate = () => {
    const email = pendingInvite?.email?.[0] ?? "";
    if (email) {
      navigate({ to: "/admin/accept-invite", search: { email } });
    } else {
      navigate({ to: "/admin/accept-invite", search: { email: undefined } });
    }
  };

  return (
    <div className="container py-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-destructive/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-base">
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {isAuthenticated
                  ? "This page requires administrator privileges. If you believe you should have access, please contact support."
                  : "Please log in with an administrator account to access this page."}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {!isAuthenticated && (
                  <Button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    data-ocid="access_denied.login_button"
                  >
                    {isLoggingIn ? "Logging in..." : "Sign in with Passkey"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                  data-ocid="access_denied.home_button"
                >
                  Return to Home
                </Button>
              </div>
              {!isAuthenticated && (
                <SocialLoginButtons
                  layout="row"
                  className="w-full max-w-sm mx-auto"
                />
              )}
            </div>

            {isAuthenticated && !pendingInvite && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Need Admin Access?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact your system administrator to request admin privileges
                  for your account.
                </p>
              </div>
            )}

            <div className="text-center pt-2">
              <a
                href="/admin-claim"
                className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
              >
                First-time setup? Claim Super Admin Access →
              </a>
            </div>
          </CardContent>
        </Card>

        {isAuthenticated && pendingInvite && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl">Pending Admin Invite</CardTitle>
              <CardDescription>
                You have a pending admin invite. Click below to activate your
                account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Role:{" "}
                  <span className="font-medium text-foreground">
                    {pendingInvite.role}
                  </span>
                </p>
                {pendingInvite.email?.[0] && (
                  <p className="text-sm text-muted-foreground">
                    Email:{" "}
                    <span className="font-medium text-foreground">
                      {pendingInvite.email?.[0]}
                    </span>
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleActivate}
                data-ocid="access_denied.activate_admin_button"
              >
                Activate Admin Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
