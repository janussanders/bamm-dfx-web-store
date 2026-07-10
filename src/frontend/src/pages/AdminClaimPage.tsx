import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationClaimSuperAdmin } from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LEGAL_ENTITY_DISPLAY } from "../legal/marketing";

export function AdminClaimPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, isLoggingIn } = useInternetIdentity();
  const { mutateAsync: claimSuperAdmin, isPending } =
    useMutationClaimSuperAdmin();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate({ to: "/admin" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await claimSuperAdmin({ code, name, email });
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to claim Super Admin access. Check the code and try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Shield className="h-8 w-8 text-amber-500" />
          <span className="text-xl font-bold text-white tracking-wide">
            {LEGAL_ENTITY_DISPLAY}
          </span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
          {success ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold text-white">
                Super Admin Access Granted!
              </h2>
              <p className="text-gray-400">Redirecting to admin panel...</p>
            </div>
          ) : !isAuthenticated ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <Shield className="h-12 w-12 text-amber-500" />
              <h2 className="text-xl font-bold text-white">Sign In Required</h2>
              <p className="text-gray-400 text-sm">
                You must be signed in with Internet Identity to claim Super
                Admin access.
              </p>
              <Button
                onClick={() => login()}
                disabled={isLoggingIn}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                    In...
                  </>
                ) : (
                  "Sign In with Internet Identity"
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Claim Super Admin Access
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Enter the one-time claim code to register your Internet
                  Identity as a Super Admin.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-gray-300">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-gray-300">
                    Email
                  </Label>
                  <p className="text-xs text-gray-500">
                    Used for admin records only — Internet Identity is your
                    actual login.
                  </p>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="code" className="text-gray-300">
                    Claim Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter claim code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 font-mono"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                  data-ocid="admin-claim.submit_button"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Claiming...
                    </>
                  ) : (
                    "Claim Super Admin"
                  )}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-gray-800 flex justify-center">
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/access-denied", search: { email: undefined } })
              }
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminClaimPage;
