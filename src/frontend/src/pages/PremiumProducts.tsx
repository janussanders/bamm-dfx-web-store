import type { ShoppingItem } from "@/backend";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { Check, Loader2, Shield, Sparkles, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FeatureImageLightbox,
  type FeatureLightboxState,
} from "../components/FeatureImageLightbox";
import { FeatureImagePreview } from "../components/FeatureImagePreview";
import RegulatedFeatureDisclaimer from "../components/RegulatedFeatureDisclaimer";
import {
  BUNDLE_CATALOG,
  type BundleDisplayRow,
  bundleIncludesRegulatedFeatures,
  bundleSaveText,
  formatAnnualPricePerYear,
  snapshotToDisplayRow,
  toBundleDisplayRow,
} from "../data/bundleCatalog";
import {
  useCreateCheckoutSession,
  useGetLicenseBundles,
  useGetLicenseFeatures,
  useGetPremiumFeatures,
} from "../hooks/useQueries";
import {
  LANDING_LEGAL_NOTICE,
  PREMIUM_AI_SETUP_TIP,
  PREMIUM_ALACARTE_DIVIDER,
  PREMIUM_ALACARTE_FOOTER,
  PREMIUM_BUNDLE_SECTION_SUBHEAD,
  PREMIUM_BUNDLE_SECTION_TITLE,
  PREMIUM_PAGE_BADGE,
  PREMIUM_PAGE_HEADLINE,
  PREMIUM_PAGE_SUBHEAD,
  PREMIUM_PAYMENT_CARD_BODY,
  PREMIUM_PAYMENT_CARD_TITLE,
  PREMIUM_SELECT_SUBHEAD,
  PREMIUM_SUBSCRIPTION_TEASER_BODY,
  PREMIUM_SUBSCRIPTION_TEASER_TITLE,
  featureMarketingDescription,
  regulatedFeatureCardDisclaimer,
} from "../legal/marketing";

const PROMO_CODES: Record<
  string,
  { discount: number; type: "percentage" | "fixed" }
> = {
  WELCOME10: { discount: 10, type: "percentage" },
  SAVE20: { discount: 20, type: "percentage" },
  FLAT5: { discount: 500, type: "fixed" },
};

export default function PremiumProducts() {
  const { data: features, isLoading: featuresLoading } =
    useGetPremiumFeatures();
  const { data: licenseFeatures, isLoading: licenseFeaturesLoading } =
    useGetLicenseFeatures();
  const { data: licenseBundles, isLoading: bundlesLoading } =
    useGetLicenseBundles();
  const createCheckout = useCreateCheckoutSession();

  const featureCatalog = licenseFeatures ?? features ?? [];

  const bundleCatalog = useMemo<BundleDisplayRow[]>(() => {
    if (licenseBundles && licenseBundles.length > 0) {
      return licenseBundles.map((bundle) =>
        toBundleDisplayRow(bundle, featureCatalog),
      );
    }
    return BUNDLE_CATALOG.map((row) =>
      snapshotToDisplayRow(row, featureCatalog),
    );
  }, [licenseBundles, featureCatalog]);

  const isLoading = featuresLoading || licenseFeaturesLoading || bundlesLoading;

  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(),
  );
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<FeatureLightboxState>(null);

  const selectedBundle = useMemo(
    () =>
      bundleCatalog.find((bundle) => bundle.bundleId === selectedBundleId) ??
      null,
    [bundleCatalog, selectedBundleId],
  );

  const selectedRegulated = useMemo(() => {
    if (selectedBundle) {
      return bundleIncludesRegulatedFeatures(selectedBundle);
    }
    if (!features) return false;
    for (const featureId of selectedFeatures) {
      const feature = features.find((f) => f.id === featureId);
      const name = feature?.licenseReferenceName || feature?.name || "";
      if (name === "Trades" || name === "Tx Simulator") return true;
    }
    return false;
  }, [features, selectedBundle, selectedFeatures]);

  const pricing = useMemo(() => {
    let subtotal = 0;
    if (selectedBundle) {
      subtotal = selectedBundle.priceInCentsAnnual;
    } else {
      for (const featureId of selectedFeatures) {
        const feature = features?.find((f) => f.id === featureId);
        if (feature) {
          subtotal += Number(feature.priceInCents);
        }
      }
    }

    let discount = 0;
    if (appliedPromo && PROMO_CODES[appliedPromo]) {
      const promo = PROMO_CODES[appliedPromo];
      if (promo.type === "percentage") {
        discount = Math.round(subtotal * (promo.discount / 100));
      } else {
        discount = promo.discount;
      }
    }

    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
  }, [selectedBundle, selectedFeatures, appliedPromo, features]);

  const hasSelection = Boolean(selectedBundle) || selectedFeatures.size > 0;

  const handleBundleSelect = (bundleId: string) => {
    setSelectedBundleId((current) => (current === bundleId ? null : bundleId));
    setSelectedFeatures(new Set());
  };

  const handleFeatureToggle = (featureId: string) => {
    setSelectedBundleId(null);
    setSelectedFeatures((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(featureId)) {
        newSet.delete(featureId);
      } else {
        newSet.add(featureId);
      }
      return newSet;
    });
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      setAppliedPromo(code);
      toast.success(`Promo code "${code}" applied!`);
    } else {
      toast.error("Invalid promo code");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    toast.success("Promo code removed");
  };

  const handleCheckout = async () => {
    if (!hasSelection) {
      toast.error("Please select a bundle or at least one premium feature");
      return;
    }

    setCheckoutError(null);
    setIsProcessing(true);

    const items: ShoppingItem[] = selectedBundle
      ? [
          {
            productName: selectedBundle.name,
            productDescription: `Annual bundle: ${selectedBundle.licenseReferenceNames.join(", ")}`,
            priceInCents: BigInt(selectedBundle.priceInCentsAnnual),
            currency: "USD",
            quantity: BigInt(1),
          },
        ]
      : Array.from(selectedFeatures).map((featureId) => {
          const feature = features?.find((f) => f.id === featureId);
          return {
            productName: feature?.name || featureId,
            productDescription: feature?.description || "",
            priceInCents: feature?.priceInCents || BigInt(0),
            currency: "USD",
            quantity: BigInt(1),
          };
        });

    if (appliedPromo && pricing.discount > 0) {
      items.push({
        productName: `Promo Code: ${appliedPromo}`,
        productDescription: "Discount applied",
        priceInCents: BigInt(-pricing.discount),
        currency: "USD",
        quantity: BigInt(1),
      });
    }

    const totalCents = items.reduce(
      (sum, item) => sum + Number(item.priceInCents) * Number(item.quantity),
      0,
    );
    if (totalCents < 50) {
      setCheckoutError(
        "Minimum purchase amount is $0.50. Please add more items or adjust your selection.",
      );
      setIsProcessing(false);
      return;
    }

    try {
      const checkoutUrl = await createCheckout.mutateAsync(items);
      if (
        typeof checkoutUrl === "string" &&
        checkoutUrl.startsWith("https://checkout.stripe.com")
      ) {
        window.location.href = checkoutUrl;
      } else {
        setCheckoutError(
          "Checkout unavailable. Please try again or contact support.",
        );
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session. Please try again.");
      setIsProcessing(false);
    }
  };

  const formatPrice = (priceInCents: bigint | number) => {
    const cents =
      typeof priceInCents === "bigint" ? Number(priceInCents) : priceInCents;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const renderBundleCard = (bundle: BundleDisplayRow) => {
    const isSelected = selectedBundleId === bundle.bundleId;
    const saveText = bundleSaveText(bundle);

    return (
      <Card
        key={bundle.bundleId}
        className={`cursor-pointer transition-all ${
          isSelected
            ? "border-primary shadow-md ring-2 ring-primary/20"
            : "hover:border-primary/50"
        }`}
        onClick={() => handleBundleSelect(bundle.bundleId)}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{bundle.name}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {formatAnnualPricePerYear(bundle.priceInCentsAnnual)}
                </Badge>
                {bundle.badge && (
                  <Badge variant="default" className="text-xs">
                    {bundle.badge}
                  </Badge>
                )}
              </div>
              {bundle.headline && (
                <CardDescription className="text-sm font-medium text-foreground">
                  {bundle.headline}
                </CardDescription>
              )}
              {bundle.bullets.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  {bundle.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {saveText && (
                <p className="text-xs text-green-700 font-medium">{saveText}</p>
              )}
              {(bundle.disclaimer ||
                bundleIncludesRegulatedFeatures(bundle)) && (
                <p className="text-xs text-muted-foreground italic">
                  {bundle.disclaimer ||
                    "Includes regulated modules — review disclaimers before checkout."}
                </p>
              )}
            </div>
            <div
              className={`
              h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
              ${
                isSelected
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              }
            `}
            >
              {isSelected && (
                <Check className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-20">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-20">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mb-4">
            {PREMIUM_PAGE_BADGE}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold">
            {PREMIUM_PAGE_HEADLINE}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {PREMIUM_PAGE_SUBHEAD}
          </p>
        </div>

        {selectedRegulated && <RegulatedFeatureDisclaimer variant="checkout" />}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {PREMIUM_BUNDLE_SECTION_TITLE}
                </h2>
                <p className="text-muted-foreground">
                  {PREMIUM_BUNDLE_SECTION_SUBHEAD}
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {bundleCatalog.map(renderBundleCard)}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {PREMIUM_ALACARTE_DIVIDER}
                </span>
                <Separator className="flex-1" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  Select Premium Features
                </h2>
                <p className="text-muted-foreground mb-6">
                  {PREMIUM_SELECT_SUBHEAD}
                </p>
              </div>

              {features && features.length > 0 ? (
                <div className="grid gap-4">
                  {features.map((feature) => {
                    const isSelected = selectedFeatures.has(feature.id);
                    const refName =
                      feature.licenseReferenceName || feature.name || "";
                    const description = featureMarketingDescription(
                      refName,
                      feature.description || "",
                    );
                    const cardDisclaimer =
                      regulatedFeatureCardDisclaimer(refName);

                    return (
                      <Card
                        key={feature.id}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary shadow-md ring-2 ring-primary/20"
                            : "hover:border-primary/50"
                        } ${selectedBundle ? "opacity-60" : ""}`}
                        onClick={() => handleFeatureToggle(feature.id)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {feature.name}
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs">
                                  {formatAnnualPricePerYear(
                                    Number(feature.priceInCents),
                                  )}
                                </Badge>
                              </div>
                              <CardDescription className="text-sm">
                                {description}
                              </CardDescription>
                              {cardDisclaimer && (
                                <p className="text-xs text-muted-foreground italic mt-2">
                                  {cardDisclaimer}
                                </p>
                              )}
                              <FeatureImagePreview
                                featureId={feature.id}
                                embedded={feature.image}
                                alt={feature.name}
                                enableLightbox
                                isolateClicks
                                hideWhenEmpty
                                className="mt-4"
                                imgClassName="w-full h-auto object-contain max-h-80 min-h-[12rem]"
                                onOpenLightbox={setLightbox}
                              />
                            </div>
                            <div
                              className={`
                            h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                            ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/30"
                            }
                          `}
                            >
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No premium features available at this time.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">
                    Desktop AI assistant ready
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {PREMIUM_AI_SETUP_TIP}
                </p>
              </CardContent>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {PREMIUM_SUBSCRIPTION_TEASER_TITLE}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {PREMIUM_SUBSCRIPTION_TEASER_BODY}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  {selectedBundle
                    ? "1 bundle selected"
                    : `${selectedFeatures.size} ${
                        selectedFeatures.size === 1 ? "feature" : "features"
                      } selected`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedBundle ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex-1 font-medium">
                        {selectedBundle.name}
                      </span>
                      <span className="font-medium">
                        {formatAnnualPricePerYear(
                          selectedBundle.priceInCentsAnnual,
                        )}
                      </span>
                    </div>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                      {selectedBundle.licenseReferenceNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                ) : selectedFeatures.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(selectedFeatures).map((featureId) => {
                      const feature = features?.find((f) => f.id === featureId);
                      return feature ? (
                        <div
                          key={featureId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex-1">{feature.name}</span>
                          <span className="font-medium">
                            {formatPrice(feature.priceInCents)}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No bundle or features selected
                  </p>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="promoCode" className="text-sm">
                    Promo Code
                  </Label>
                  {appliedPromo ? (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="flex-1 text-sm font-medium">
                        {appliedPromo}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePromo}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        id="promoCode"
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) =>
                          setPromoCode(e.target.value.toUpperCase())
                        }
                        disabled={!hasSelection}
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || !hasSelection}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(pricing.subtotal)}</span>
                  </div>

                  {pricing.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(pricing.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxes</span>
                    <span className="italic">Calculated at checkout</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total due today</span>
                    <span>{formatPrice(pricing.total)}</span>
                  </div>
                </div>

                {checkoutError && (
                  <p className="text-sm text-red-600 text-center">
                    {checkoutError}
                  </p>
                )}

                <Button
                  onClick={handleCheckout}
                  disabled={!hasSelection || isProcessing}
                  className="w-full"
                  size="lg"
                  data-ocid="premium.checkout_button"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Proceed to Checkout</>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  {PREMIUM_ALACARTE_FOOTER}. By checking out you agree to our{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms
                  </Link>
                  ,{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  , and{" "}
                  <Link to="/refunds" className="text-primary hover:underline">
                    Refund Policy
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-muted/50 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>{PREMIUM_PAYMENT_CARD_TITLE}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {PREMIUM_PAYMENT_CARD_BODY}
            </p>
            <p className="text-xs text-muted-foreground">
              {LANDING_LEGAL_NOTICE}
            </p>
          </CardContent>
        </Card>
      </div>

      <FeatureImageLightbox
        lightbox={lightbox}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
      />
    </div>
  );
}
