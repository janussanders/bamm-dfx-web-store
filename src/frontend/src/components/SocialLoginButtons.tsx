import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loadConfig } from "@caffeineai/core-infrastructure";
import { AuthClient } from "@dfinity/auth-client";
import { useCallback, useState } from "react";
import { FaApple, FaGoogle, FaMicrosoft } from "react-icons/fa";

type OidcProvider = "google" | "apple" | "microsoft";

const II_URL =
  process.env.DFX_NETWORK === "local"
    ? `http://localhost:4943/?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY}`
    : "https://identity.ic0.app";

const PROVIDER_CONFIG: Record<
  OidcProvider,
  { label: string; icon: React.ReactNode; color: string }
> = {
  google: {
    label: "Google",
    icon: <FaGoogle className="h-4 w-4" style={{ color: "#4285F4" }} />,
    color: "#4285F4",
  },
  apple: {
    label: "Apple",
    icon: <FaApple className="h-4 w-4" style={{ color: "currentColor" }} />,
    color: "currentColor",
  },
  microsoft: {
    label: "Microsoft",
    icon: <FaMicrosoft className="h-4 w-4" style={{ color: "#00A4EF" }} />,
    color: "#00A4EF",
  },
};

interface SocialLoginButtonsProps {
  /** Called when II login completes successfully (any provider) */
  onSuccess?: () => void;
  /** Layout direction — default is 'row' */
  layout?: "row" | "column";
  /** Extra class on the wrapper */
  className?: string;
}

export function SocialLoginButtons({
  onSuccess,
  layout = "row",
  className,
}: SocialLoginButtonsProps) {
  const [loading, setLoading] = useState<OidcProvider | null>(null);

  const loginWithProvider = useCallback(
    async (provider: OidcProvider) => {
      if (loading) return;
      setLoading(provider);
      try {
        // Build the II URL with the provider deep-link hash fragment.
        // II mainnet supports: https://identity.ic0.app/#authorize?provider=<name>
        const providerUrl = `${II_URL}/#authorize?provider=${provider}`;
        const config = await loadConfig();

        const client = await AuthClient.create({
          loginOptions: {
            derivationOrigin: config.ii_derivation_origin,
          },
        });
        await new Promise<void>((resolve, reject) => {
          client.login({
            identityProvider: providerUrl,
            derivationOrigin: config.ii_derivation_origin,
            onSuccess: () => {
              resolve();
              onSuccess?.();
              // Reload so the app picks up the new identity via InternetIdentityProvider
              window.location.reload();
            },
            onError: (err) => reject(new Error(err ?? "Login failed")),
          });
        });
      } catch (err) {
        // Login was cancelled or failed — silently reset
        console.warn(`[BAMM] ${provider} login cancelled or failed`, err);
      } finally {
        setLoading(null);
      }
    },
    [loading, onSuccess],
  );

  return (
    <div className={className}>
      <div className="flex items-center gap-2 my-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap px-1">
          Or sign in with
        </span>
        <Separator className="flex-1" />
      </div>

      <div
        className={
          layout === "column"
            ? "flex flex-col gap-2"
            : "flex flex-row flex-wrap gap-2 justify-center"
        }
      >
        {(Object.keys(PROVIDER_CONFIG) as OidcProvider[]).map((provider) => {
          const cfg = PROVIDER_CONFIG[provider];
          return (
            <Button
              key={provider}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => loginWithProvider(provider)}
              className="flex items-center gap-2 flex-1 min-w-[100px]"
              data-ocid={`social_login.${provider}_button`}
            >
              {loading === provider ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                cfg.icon
              )}
              <span>{loading === provider ? "Signing in..." : cfg.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
