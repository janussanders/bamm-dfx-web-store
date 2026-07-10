import type { LicenseBundle } from "@/backend";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatAnnualPrice,
  formatSavings,
  normalizeBundleFeatureIds,
  prepareBundleForSave,
  toBundleDisplayRow,
} from "../data/bundleCatalog";
import type { LicenseFeature } from "../hooks/useQueries";
import {
  useAddLicenseBundle,
  useDeleteLicenseBundle,
  useGetAllLicenseBundles,
  useGetLicenseFeatures,
  useInitializeDefaultLicenseBundles,
  useUpdateBundleStatus,
  useUpdateLicenseBundle,
} from "../hooks/useQueries";

const emptyBundle = (): LicenseBundle => ({
  bundleId: "",
  name: "",
  priceInCentsAnnual: BigInt(0),
  featureIds: [],
  headline: "",
  bullets: [],
  badge: "",
  saveTextOverride: "",
  disclaimer: "",
  alaCarteSumCents: BigInt(0),
  savingsCents: BigInt(0),
  isActive: true,
  sortOrder: BigInt(0),
});

function bulletsToText(bullets: string[]): string {
  return bullets.join("\n");
}

function textToBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function BundleManagementPanel() {
  const { data: bundles, isLoading } = useGetAllLicenseBundles();
  const { data: licenseFeatures } = useGetLicenseFeatures();
  const addBundle = useAddLicenseBundle();
  const updateBundle = useUpdateLicenseBundle();
  const deleteBundle = useDeleteLicenseBundle();
  const updateBundleStatus = useUpdateBundleStatus();
  const initializeBundles = useInitializeDefaultLicenseBundles();

  const [showAddBundle, setShowAddBundle] = useState(false);
  const [showEditBundle, setShowEditBundle] = useState(false);
  const [newBundle, setNewBundle] = useState<LicenseBundle>(emptyBundle());
  const [editingBundle, setEditingBundle] = useState<LicenseBundle | null>(
    null,
  );
  const [newBulletsText, setNewBulletsText] = useState("");
  const [editBulletsText, setEditBulletsText] = useState("");

  const premiumFeatures = useMemo(
    () => (licenseFeatures ?? []).filter((f) => f.isPremium),
    [licenseFeatures],
  );

  const toggleFeatureInNew = (featureId: string, checked: boolean) => {
    setNewBundle((prev) => {
      const ids = new Set(
        normalizeBundleFeatureIds(prev.featureIds, licenseFeatures ?? []),
      );
      if (checked) ids.add(featureId);
      else ids.delete(featureId);
      return { ...prev, featureIds: Array.from(ids) };
    });
  };

  const toggleFeatureInEdit = (featureId: string, checked: boolean) => {
    setEditingBundle((prev) => {
      if (!prev) return prev;
      const ids = new Set(
        normalizeBundleFeatureIds(prev.featureIds, licenseFeatures ?? []),
      );
      if (checked) ids.add(featureId);
      else ids.delete(featureId);
      return { ...prev, featureIds: Array.from(ids) };
    });
  };

  const handleAddBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBundle.bundleId.trim() || !newBundle.name.trim()) {
      toast.error("Bundle ID and name are required");
      return;
    }
    const featureIds = normalizeBundleFeatureIds(
      newBundle.featureIds,
      licenseFeatures ?? [],
    );
    if (featureIds.length === 0) {
      toast.error("Select at least one included feature");
      return;
    }
    try {
      await addBundle.mutateAsync(
        prepareBundleForSave(
          {
            ...newBundle,
            bundleId: newBundle.bundleId.trim(),
            name: newBundle.name.trim(),
            bullets: textToBullets(newBulletsText),
            featureIds,
          },
          licenseFeatures ?? [],
        ),
      );
      toast.success("Bundle added");
      setShowAddBundle(false);
      setNewBundle(emptyBundle());
      setNewBulletsText("");
    } catch {
      toast.error("Failed to add bundle");
    }
  };

  const handleEditBundle = (bundle: LicenseBundle) => {
    const featureIds = normalizeBundleFeatureIds(
      bundle.featureIds,
      licenseFeatures ?? [],
    );
    setEditingBundle({ ...bundle, featureIds });
    setEditBulletsText(bulletsToText(bundle.bullets));
    setShowEditBundle(true);
  };

  const handleUpdateBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBundle) return;
    try {
      await updateBundle.mutateAsync(
        prepareBundleForSave(
          {
            ...editingBundle,
            bullets: textToBullets(editBulletsText),
          },
          licenseFeatures ?? [],
        ),
      );
      toast.success("Bundle updated");
      setShowEditBundle(false);
      setEditingBundle(null);
    } catch {
      toast.error("Failed to update bundle");
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!confirm("Delete this bundle? Existing purchases are not affected.")) {
      return;
    }
    try {
      await deleteBundle.mutateAsync(bundleId);
      toast.success("Bundle deleted");
    } catch {
      toast.error("Failed to delete bundle");
    }
  };

  const handleToggleStatus = async (bundleId: string, isActive: boolean) => {
    try {
      await updateBundleStatus.mutateAsync({ bundleId, isActive: !isActive });
      toast.success(isActive ? "Bundle disabled" : "Bundle enabled");
    } catch {
      toast.error("Failed to update bundle status");
    }
  };

  const handleInitialize = async () => {
    if ((licenseFeatures ?? []).length === 0) {
      toast.error("Initialize Default Premium Features before bundles");
      return;
    }
    try {
      await initializeBundles.mutateAsync();
      toast.success(
        "Default bundles initialized. Open each bundle to verify included features are checked.",
      );
    } catch {
      toast.error("Failed to initialize bundles");
    }
  };

  const renderFeaturePicker = (
    selectedIds: string[],
    onToggle: (featureId: string, checked: boolean) => void,
  ) => {
    const normalizedSelected = normalizeBundleFeatureIds(
      selectedIds,
      licenseFeatures ?? [],
    );
    return (
      <div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
        {premiumFeatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Initialize premium features first.
          </p>
        ) : (
          premiumFeatures.map((feature) => (
            <div key={feature.id} className="flex items-center gap-2">
              <Checkbox
                id={`bundle-feature-${feature.id}`}
                checked={normalizedSelected.includes(feature.id)}
                onCheckedChange={(checked) =>
                  onToggle(feature.id, checked === true)
                }
              />
              <Label
                htmlFor={`bundle-feature-${feature.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {feature.name} — $
                {(Number(feature.priceInCents || 0) / 100).toFixed(2)}/yr
              </Label>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderPricingPreview = (
    bundle: LicenseBundle,
    features: LicenseFeature[],
  ) => {
    const row = toBundleDisplayRow(bundle, features);
    const saveText =
      bundle.saveTextOverride.trim() ||
      (row.savingsCents > 0 ? formatSavings(row.savingsCents) : "");
    return (
      <p className="text-xs text-muted-foreground">
        À la carte sum: {formatAnnualPrice(row.alaCarteSumCents)}
        {saveText ? ` · ${saveText}` : ""}
      </p>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Bundle Management</CardTitle>
            <CardDescription>
              Pricing, marketing copy, included features, and savings for annual
              bundles. Stripe checkout and license fulfillment use bundle name
              and included features.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {bundles && bundles.length === 0 && (
              <Button
                variant="outline"
                onClick={handleInitialize}
                disabled={initializeBundles.isPending}
              >
                {initializeBundles.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  "Initialize Default Bundles"
                )}
              </Button>
            )}
            <Dialog open={showAddBundle} onOpenChange={setShowAddBundle}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bundle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Bundle</DialogTitle>
                  <DialogDescription>
                    Create an annual bundle SKU for the premium storefront.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddBundle} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bundleId">Bundle ID</Label>
                      <Input
                        id="bundleId"
                        placeholder="complete_annual"
                        value={newBundle.bundleId}
                        onChange={(e) =>
                          setNewBundle({
                            ...newBundle,
                            bundleId: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sortOrder">Sort order</Label>
                      <Input
                        id="sortOrder"
                        type="number"
                        min={0}
                        value={Number(newBundle.sortOrder)}
                        onChange={(e) =>
                          setNewBundle({
                            ...newBundle,
                            sortOrder: BigInt(
                              Number.parseInt(e.target.value || "0", 10),
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bundleName">
                      Display name (Stripe line item)
                    </Label>
                    <Input
                      id="bundleName"
                      placeholder="BAMM Complete"
                      value={newBundle.name}
                      onChange={(e) =>
                        setNewBundle({ ...newBundle, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bundlePrice">Annual price ($)</Label>
                    <Input
                      id="bundlePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={Number(newBundle.priceInCentsAnnual) / 100}
                      onChange={(e) =>
                        setNewBundle({
                          ...newBundle,
                          priceInCentsAnnual: BigInt(
                            Math.round(
                              Number.parseFloat(e.target.value || "0") * 100,
                            ),
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="headline">Slogan / headline</Label>
                    <Input
                      id="headline"
                      value={newBundle.headline}
                      onChange={(e) =>
                        setNewBundle({ ...newBundle, headline: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="badge">Best value / badge text</Label>
                    <Input
                      id="badge"
                      placeholder="Best value · Save $90"
                      value={newBundle.badge}
                      onChange={(e) =>
                        setNewBundle({ ...newBundle, badge: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saveText">Save indicator override</Label>
                    <Input
                      id="saveText"
                      placeholder="Leave blank to auto-compute from à la carte"
                      value={newBundle.saveTextOverride}
                      onChange={(e) =>
                        setNewBundle({
                          ...newBundle,
                          saveTextOverride: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bullets">Bullets (one per line)</Label>
                    <Textarea
                      id="bullets"
                      rows={4}
                      value={newBulletsText}
                      onChange={(e) => setNewBulletsText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disclaimer">Disclaimer</Label>
                    <Textarea
                      id="disclaimer"
                      rows={2}
                      value={newBundle.disclaimer}
                      onChange={(e) =>
                        setNewBundle({
                          ...newBundle,
                          disclaimer: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Included features</Label>
                    {renderFeaturePicker(
                      newBundle.featureIds,
                      toggleFeatureInNew,
                    )}
                    {licenseFeatures &&
                      renderPricingPreview(newBundle, licenseFeatures)}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={addBundle.isPending}
                  >
                    {addBundle.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Bundle"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bundles && bundles.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Includes</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundles.map((bundle) => {
                const row = toBundleDisplayRow(bundle, licenseFeatures ?? []);
                return (
                  <TableRow key={bundle.bundleId}>
                    <TableCell>{Number(bundle.sortOrder)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {bundle.bundleId}
                    </TableCell>
                    <TableCell>{bundle.name}</TableCell>
                    <TableCell>
                      {formatAnnualPrice(row.priceInCentsAnnual)}/yr
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {bundle.badge || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {row.licenseReferenceNames.join(", ")}
                    </TableCell>
                    <TableCell className="text-sm text-green-700">
                      {bundle.saveTextOverride ||
                        (row.savingsCents > 0
                          ? formatSavings(row.savingsCents)
                          : "—")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={bundle.isActive}
                          onCheckedChange={() =>
                            handleToggleStatus(bundle.bundleId, bundle.isActive)
                          }
                          disabled={updateBundleStatus.isPending}
                        />
                        <span className="text-sm text-muted-foreground">
                          {bundle.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBundle(bundle)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBundle(bundle.bundleId)}
                          disabled={deleteBundle.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">No bundles configured yet</p>
            <Button
              onClick={handleInitialize}
              disabled={initializeBundles.isPending}
            >
              {initializeBundles.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Default Bundles"
              )}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={showEditBundle} onOpenChange={setShowEditBundle}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
            <DialogDescription>
              Update pricing, copy, and included features. Changing the display
              name updates future Stripe line items; fulfillment matches by name
              or bundle ID.
            </DialogDescription>
          </DialogHeader>
          {editingBundle && (
            <form onSubmit={handleUpdateBundle} className="space-y-4">
              <div className="space-y-2">
                <Label>Bundle ID</Label>
                <Input value={editingBundle.bundleId} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBundleName">Display name</Label>
                <Input
                  id="editBundleName"
                  value={editingBundle.name}
                  onChange={(e) =>
                    setEditingBundle({
                      ...editingBundle,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editBundlePrice">Annual price ($)</Label>
                  <Input
                    id="editBundlePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={Number(editingBundle.priceInCentsAnnual) / 100}
                    onChange={(e) =>
                      setEditingBundle({
                        ...editingBundle,
                        priceInCentsAnnual: BigInt(
                          Math.round(
                            Number.parseFloat(e.target.value || "0") * 100,
                          ),
                        ),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSortOrder">Sort order</Label>
                  <Input
                    id="editSortOrder"
                    type="number"
                    min={0}
                    value={Number(editingBundle.sortOrder)}
                    onChange={(e) =>
                      setEditingBundle({
                        ...editingBundle,
                        sortOrder: BigInt(
                          Number.parseInt(e.target.value || "0", 10),
                        ),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editHeadline">Slogan / headline</Label>
                <Input
                  id="editHeadline"
                  value={editingBundle.headline}
                  onChange={(e) =>
                    setEditingBundle({
                      ...editingBundle,
                      headline: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBadge">Best value / badge text</Label>
                <Input
                  id="editBadge"
                  value={editingBundle.badge}
                  onChange={(e) =>
                    setEditingBundle({
                      ...editingBundle,
                      badge: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSaveText">Save indicator override</Label>
                <Input
                  id="editSaveText"
                  value={editingBundle.saveTextOverride}
                  onChange={(e) =>
                    setEditingBundle({
                      ...editingBundle,
                      saveTextOverride: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBullets">Bullets (one per line)</Label>
                <Textarea
                  id="editBullets"
                  rows={4}
                  value={editBulletsText}
                  onChange={(e) => setEditBulletsText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDisclaimer">Disclaimer</Label>
                <Textarea
                  id="editDisclaimer"
                  rows={2}
                  value={editingBundle.disclaimer}
                  onChange={(e) =>
                    setEditingBundle({
                      ...editingBundle,
                      disclaimer: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Included features</Label>
                {renderFeaturePicker(
                  editingBundle.featureIds,
                  toggleFeatureInEdit,
                )}
                {licenseFeatures &&
                  renderPricingPreview(editingBundle, licenseFeatures)}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={updateBundle.isPending}
              >
                {updateBundle.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Bundle"
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
