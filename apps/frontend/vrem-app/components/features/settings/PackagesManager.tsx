"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Camera,
  Video,
  FileText,
  Plane,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  ServicePackage,
  PackageAddOn,
  MediaType,
  AddOnCategory,
  CreatePackagePayload,
  CreateAddOnPayload,
} from "@/types";
import { cn } from "@/lib/utils";

function formatPrice(cents: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function parsePriceInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

const MEDIA_TYPE_OPTIONS = [
  { value: MediaType.PHOTO, label: "Photography", icon: Camera },
  { value: MediaType.VIDEO, label: "Video", icon: Video },
  { value: MediaType.FLOORPLAN, label: "Floor Plan", icon: FileText },
  { value: MediaType.DOCUMENT, label: "Document", icon: FileText },
];

const CURRENCY_OPTIONS = [
  { value: "usd", label: "USD ($)", symbol: "$" },
  { value: "eur", label: "EUR (€)", symbol: "€" },
  { value: "gbp", label: "GBP (£)", symbol: "£" },
  { value: "cad", label: "CAD ($)", symbol: "$" },
  { value: "aud", label: "AUD ($)", symbol: "$" },
  { value: "nzd", label: "NZD ($)", symbol: "$" },
  { value: "chf", label: "CHF", symbol: "CHF " },
  { value: "jpy", label: "JPY (¥)", symbol: "¥" },
  { value: "inr", label: "INR (₹)", symbol: "₹" },
  { value: "mxn", label: "MXN ($)", symbol: "$" },
  { value: "brl", label: "BRL (R$)", symbol: "R$" },
];

const ADD_ON_CATEGORY_OPTIONS = [
  { value: AddOnCategory.AERIAL, label: "Aerial/Drone" },
  { value: AddOnCategory.TWILIGHT, label: "Twilight" },
  { value: AddOnCategory.VIRTUAL_TOUR, label: "3D Virtual Tour" },
  { value: AddOnCategory.FLOORPLAN, label: "Floor Plan" },
  { value: AddOnCategory.RUSH, label: "Rush Delivery" },
  { value: AddOnCategory.OTHER, label: "Other" },
];

interface PackageFormData {
  name: string;
  description: string;
  price: string;
  currency: string;
  mediaTypes: MediaType[];
  turnaroundDays: string;
  photoCount: string;
  videoMinutes: string;
  features: string;
  isActive: boolean;
}

interface AddOnFormData {
  name: string;
  description: string;
  price: string;
  currency: string;
  category: AddOnCategory;
  isActive: boolean;
}

const defaultPackageForm: PackageFormData = {
  name: "",
  description: "",
  price: "",
  currency: "usd",
  mediaTypes: [],
  turnaroundDays: "",
  photoCount: "",
  videoMinutes: "",
  features: "",
  isActive: true,
};

const defaultAddOnForm: AddOnFormData = {
  name: "",
  description: "",
  price: "",
  currency: "usd",
  category: AddOnCategory.OTHER,
  isActive: true,
};

function getCurrencySymbol(currency: string): string {
  return CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol || "$";
}

export function PackagesManager() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addOns, setAddOns] = useState<PackageAddOn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Package dialog state
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormData>(defaultPackageForm);
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  // Add-on dialog state
  const [addOnDialogOpen, setAddOnDialogOpen] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<PackageAddOn | null>(null);
  const [addOnForm, setAddOnForm] = useState<AddOnFormData>(defaultAddOnForm);
  const [isSavingAddOn, setIsSavingAddOn] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "package" | "addon";
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch packages and add-ons
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [pkgs, ons] = await Promise.all([
          api.packages.list(),
          api.packages.listAddOns(),
        ]);

        if (!cancelled) {
          setPackages(pkgs);
          setAddOns(ons);
        }
      } catch (err) {
        console.error("Failed to fetch packages:", err);
        if (!cancelled) {
          setError("Failed to load packages. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Package handlers
  const handleCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm(defaultPackageForm);
    setPackageDialogOpen(true);
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      description: pkg.description || "",
      price: (pkg.price / 100).toFixed(2),
      currency: pkg.currency || "usd",
      mediaTypes: pkg.mediaTypes,
      turnaroundDays: pkg.turnaroundDays?.toString() || "",
      photoCount: pkg.photoCount?.toString() || "",
      videoMinutes: pkg.videoMinutes?.toString() || "",
      features: pkg.features.join("\n"),
      isActive: pkg.isActive,
    });
    setPackageDialogOpen(true);
  };

  const handleSavePackage = async () => {
    if (!packageForm.name.trim()) {
      toast.error("Package name is required");
      return;
    }
    if (!packageForm.price || parsePriceInput(packageForm.price) === 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (packageForm.mediaTypes.length === 0) {
      toast.error("Please select at least one media type");
      return;
    }

    setIsSavingPackage(true);
    try {
      const payload: CreatePackagePayload = {
        name: packageForm.name.trim(),
        description: packageForm.description.trim() || undefined,
        price: parsePriceInput(packageForm.price),
        currency: packageForm.currency,
        mediaTypes: packageForm.mediaTypes,
        turnaroundDays: packageForm.turnaroundDays
          ? parseInt(packageForm.turnaroundDays)
          : undefined,
        photoCount: packageForm.photoCount
          ? parseInt(packageForm.photoCount)
          : undefined,
        videoMinutes: packageForm.videoMinutes
          ? parseInt(packageForm.videoMinutes)
          : undefined,
        features: packageForm.features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
      };

      if (editingPackage) {
        const updated = await api.packages.update(editingPackage.id, {
          ...payload,
          isActive: packageForm.isActive,
        });
        setPackages((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        toast.success("Package updated successfully");
      } else {
        const created = await api.packages.create(payload);
        setPackages((prev) => [...prev, created]);
        toast.success("Package created successfully");
      }

      setPackageDialogOpen(false);
    } catch (err) {
      console.error("Failed to save package:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save package"
      );
    } finally {
      setIsSavingPackage(false);
    }
  };

  // Add-on handlers
  const handleCreateAddOn = () => {
    setEditingAddOn(null);
    setAddOnForm(defaultAddOnForm);
    setAddOnDialogOpen(true);
  };

  const handleEditAddOn = (addOn: PackageAddOn) => {
    setEditingAddOn(addOn);
    setAddOnForm({
      name: addOn.name,
      description: addOn.description || "",
      price: (addOn.price / 100).toFixed(2),
      currency: addOn.currency || "usd",
      category: addOn.category,
      isActive: addOn.isActive,
    });
    setAddOnDialogOpen(true);
  };

  const handleSaveAddOn = async () => {
    if (!addOnForm.name.trim()) {
      toast.error("Add-on name is required");
      return;
    }
    if (!addOnForm.price || parsePriceInput(addOnForm.price) === 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsSavingAddOn(true);
    try {
      const payload: CreateAddOnPayload = {
        name: addOnForm.name.trim(),
        description: addOnForm.description.trim() || undefined,
        price: parsePriceInput(addOnForm.price),
        currency: addOnForm.currency,
        category: addOnForm.category,
      };

      if (editingAddOn) {
        const updated = await api.packages.updateAddOn(editingAddOn.id, {
          ...payload,
          isActive: addOnForm.isActive,
        });
        setAddOns((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        toast.success("Add-on updated successfully");
      } else {
        const created = await api.packages.createAddOn(payload);
        setAddOns((prev) => [...prev, created]);
        toast.success("Add-on created successfully");
      }

      setAddOnDialogOpen(false);
    } catch (err) {
      console.error("Failed to save add-on:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save add-on");
    } finally {
      setIsSavingAddOn(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (
    type: "package" | "addon",
    id: string,
    name: string
  ) => {
    setItemToDelete({ type, id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      if (itemToDelete.type === "package") {
        await api.packages.delete(itemToDelete.id);
        setPackages((prev) => prev.filter((p) => p.id !== itemToDelete.id));
        toast.success("Package deleted successfully");
      } else {
        await api.packages.deleteAddOn(itemToDelete.id);
        setAddOns((prev) => prev.filter((a) => a.id !== itemToDelete.id));
        toast.success("Add-on deleted successfully");
      }
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Failed to delete:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMediaType = (type: MediaType) => {
    setPackageForm((prev) => ({
      ...prev,
      mediaTypes: prev.mediaTypes.includes(type)
        ? prev.mediaTypes.filter((t) => t !== type)
        : [...prev.mediaTypes, type],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="packages">
            <Package className="h-4 w-4 mr-2" />
            Packages ({packages.length})
          </TabsTrigger>
          <TabsTrigger value="addons">
            <Sparkles className="h-4 w-4 mr-2" />
            Add-ons ({addOns.length})
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Service packages that agents can select when booking.
            </p>
            <Button onClick={handleCreatePackage}>
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          </div>

          {packages.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No packages yet. Create your first service package.
                </p>
                <Button onClick={handleCreatePackage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Package
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={cn(!pkg.isActive && "opacity-60")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          {!pkg.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {pkg.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {pkg.mediaTypes.map((type) => (
                            <Badge key={type} variant="outline">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {pkg.turnaroundDays && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {pkg.turnaroundDays} day turnaround
                            </span>
                          )}
                          {pkg.photoCount && (
                            <span className="flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              {pkg.photoCount} photos
                            </span>
                          )}
                          {pkg.videoMinutes && (
                            <span className="flex items-center gap-1">
                              <Video className="h-4 w-4" />
                              {pkg.videoMinutes} min video
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-2xl font-bold">
                          {formatPrice(pkg.price, pkg.currency)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPackage(pkg)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteClick("package", pkg.id, pkg.name)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Add-ons Tab */}
        <TabsContent value="addons" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Optional add-ons that agents can include with their booking.
            </p>
            <Button onClick={handleCreateAddOn}>
              <Plus className="h-4 w-4 mr-2" />
              New Add-on
            </Button>
          </div>

          {addOns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No add-ons yet. Create optional services agents can add.
                </p>
                <Button onClick={handleCreateAddOn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Add-on
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {addOns.map((addOn) => (
                <Card
                  key={addOn.id}
                  className={cn(!addOn.isActive && "opacity-60")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{addOn.name}</h4>
                          {!addOn.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs mb-2">
                          {
                            ADD_ON_CATEGORY_OPTIONS.find(
                              (c) => c.value === addOn.category
                            )?.label
                          }
                        </Badge>
                        {addOn.description && (
                          <p className="text-sm text-muted-foreground">
                            {addOn.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="font-semibold">
                          +{formatPrice(addOn.price, addOn.currency)}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAddOn(addOn)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteClick("addon", addOn.id, addOn.name)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Package Dialog */}
      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Create Package"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Update the package details below."
                : "Fill in the details for your new service package."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pkg-name">Package Name *</Label>
              <Input
                id="pkg-name"
                placeholder="e.g., Standard Photography Package"
                value={packageForm.name}
                onChange={(e) =>
                  setPackageForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pkg-description">Description</Label>
              <Textarea
                id="pkg-description"
                placeholder="Describe what's included in this package..."
                value={packageForm.description}
                onChange={(e) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pkg-price">Price *</Label>
              <div className="flex gap-2">
                <Select
                  value={packageForm.currency}
                  onValueChange={(value) =>
                    setPackageForm((prev) => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol(packageForm.currency)}
                  </span>
                  <Input
                    id="pkg-price"
                    type="text"
                    placeholder="0.00"
                    className="pl-8"
                    value={packageForm.price}
                    onChange={(e) =>
                      setPackageForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Media Types *</Label>
              <div className="flex flex-wrap gap-2">
                {MEDIA_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = packageForm.mediaTypes.includes(
                    option.value
                  );
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleMediaType(option.value)}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Optional Details Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground text-sm">Optional Details</Label>
                <span className="text-xs text-muted-foreground">(leave blank if not applicable)</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pkg-turnaround" className="text-sm">Turnaround (days)</Label>
                  <Input
                    id="pkg-turnaround"
                    type="number"
                    min="1"
                    placeholder="Optional"
                    value={packageForm.turnaroundDays}
                    onChange={(e) =>
                      setPackageForm((prev) => ({
                        ...prev,
                        turnaroundDays: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pkg-photos" className="text-sm">Photo Count</Label>
                  <Input
                    id="pkg-photos"
                    type="number"
                    min="1"
                    placeholder="Optional"
                    value={packageForm.photoCount}
                    onChange={(e) =>
                      setPackageForm((prev) => ({
                        ...prev,
                        photoCount: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pkg-video" className="text-sm">Video (minutes)</Label>
                  <Input
                    id="pkg-video"
                    type="number"
                    min="1"
                    placeholder="Optional"
                    value={packageForm.videoMinutes}
                    onChange={(e) =>
                      setPackageForm((prev) => ({
                        ...prev,
                        videoMinutes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pkg-features" className="text-sm">Features (one per line, optional)</Label>
              <Textarea
                id="pkg-features"
                placeholder="Professional editing&#10;24-hour turnaround&#10;Unlimited revisions"
                rows={4}
                value={packageForm.features}
                onChange={(e) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    features: e.target.value,
                  }))
                }
              />
            </div>

            {editingPackage && (
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label htmlFor="pkg-active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive packages won't be shown to agents
                  </p>
                </div>
                <Switch
                  id="pkg-active"
                  checked={packageForm.isActive}
                  onCheckedChange={(checked) =>
                    setPackageForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPackageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePackage} disabled={isSavingPackage}>
              {isSavingPackage
                ? "Saving..."
                : editingPackage
                  ? "Update Package"
                  : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-on Dialog */}
      <Dialog open={addOnDialogOpen} onOpenChange={setAddOnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAddOn ? "Edit Add-on" : "Create Add-on"}
            </DialogTitle>
            <DialogDescription>
              {editingAddOn
                ? "Update the add-on details below."
                : "Fill in the details for your new add-on service."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="addon-name">Add-on Name *</Label>
              <Input
                id="addon-name"
                placeholder="e.g., Drone Aerial Photography"
                value={addOnForm.name}
                onChange={(e) =>
                  setAddOnForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="addon-category">Category</Label>
              <Select
                value={addOnForm.category}
                onValueChange={(value) =>
                  setAddOnForm((prev) => ({
                    ...prev,
                    category: value as AddOnCategory,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADD_ON_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="addon-description">Description</Label>
              <Textarea
                id="addon-description"
                placeholder="Describe what's included..."
                value={addOnForm.description}
                onChange={(e) =>
                  setAddOnForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="addon-price">Price *</Label>
              <div className="flex gap-2">
                <Select
                  value={addOnForm.currency}
                  onValueChange={(value) =>
                    setAddOnForm((prev) => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol(addOnForm.currency)}
                  </span>
                  <Input
                    id="addon-price"
                    type="text"
                    placeholder="0.00"
                    className="pl-8"
                    value={addOnForm.price}
                    onChange={(e) =>
                      setAddOnForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {editingAddOn && (
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label htmlFor="addon-active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive add-ons won't be shown to agents
                  </p>
                </div>
                <Switch
                  id="addon-active"
                  checked={addOnForm.isActive}
                  onCheckedChange={(checked) =>
                    setAddOnForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddOn} disabled={isSavingAddOn}>
              {isSavingAddOn
                ? "Saving..."
                : editingAddOn
                  ? "Update Add-on"
                  : "Create Add-on"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
