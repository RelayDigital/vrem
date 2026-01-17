"use client";

import { useEffect, useState, useCallback } from "react";
import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Image,
  Film,
  Layers,
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
  { value: MediaType.PHOTO, label: "Photography", icon: Camera, description: "Professional photos" },
  { value: MediaType.VIDEO, label: "Video", icon: Video, description: "Video production" },
  { value: MediaType.FLOORPLAN, label: "Floor Plan", icon: Layers, description: "2D/3D floor plans" },
  { value: MediaType.DOCUMENT, label: "Document", icon: FileText, description: "Documents & reports" },
];

const CURRENCY_OPTIONS = [
  { value: "usd", label: "USD", symbol: "$" },
  { value: "eur", label: "EUR", symbol: "€" },
  { value: "gbp", label: "GBP", symbol: "£" },
  { value: "cad", label: "CAD", symbol: "$" },
  { value: "aud", label: "AUD", symbol: "$" },
  { value: "nzd", label: "NZD", symbol: "$" },
  { value: "chf", label: "CHF", symbol: "CHF" },
  { value: "jpy", label: "JPY", symbol: "¥" },
  { value: "inr", label: "INR", symbol: "₹" },
  { value: "mxn", label: "MXN", symbol: "$" },
  { value: "brl", label: "BRL", symbol: "R$" },
];

const ADD_ON_CATEGORY_OPTIONS = [
  { value: AddOnCategory.AERIAL, label: "Aerial/Drone", icon: "🚁" },
  { value: AddOnCategory.TWILIGHT, label: "Twilight", icon: "🌅" },
  { value: AddOnCategory.VIRTUAL_TOUR, label: "3D Virtual Tour", icon: "🏠" },
  { value: AddOnCategory.FLOORPLAN, label: "Floor Plan", icon: "📐" },
  { value: AddOnCategory.RUSH, label: "Rush Delivery", icon: "⚡" },
  { value: AddOnCategory.OTHER, label: "Other", icon: "✨" },
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
  features: string[];
  images: string[];
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
  features: [],
  images: [],
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

// Feature list editor component
function FeatureListEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (features: string[]) => void;
}) {
  const [newFeature, setNewFeature] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      onChange([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFeatures = [...features];
    [newFeatures[index - 1], newFeatures[index]] = [newFeatures[index], newFeatures[index - 1]];
    onChange(newFeatures);
  };

  const handleMoveDown = (index: number) => {
    if (index === features.length - 1) return;
    const newFeatures = [...features];
    [newFeatures[index], newFeatures[index + 1]] = [newFeatures[index + 1], newFeatures[index]];
    onChange(newFeatures);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(features[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const newFeatures = [...features];
      newFeatures[editingIndex] = editValue.trim();
      onChange(newFeatures);
    }
    setEditingIndex(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddFeature();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing features */}
      {features.length > 0 && (
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-transparent hover:border-border transition-colors"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col -my-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === features.length - 1}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>

              {/* Feature text or edit input */}
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveEdit}
                  >
                    <Check className="size-4 text-green-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleCancelEdit}
                  >
                    <X className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm">{feature}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleStartEdit(index)}
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleRemoveFeature(index)}
                    >
                      <X className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new feature */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Add a feature (e.g., Professional editing)"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddFeature}
          disabled={!newFeature.trim()}
        >
          Add
        </Button>
      </div>

      {features.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No features added yet. Features help customers understand what's included.
        </p>
      )}
    </div>
  );
}

// Image list editor component
function ImageListEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const handleRemoveImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onChange(newImages);
  };

  const handleMoveRight = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    onChange(newImages);
  };

  const handleUploadSuccess = (info: any) => {
    if (!info?.allEntries) return;

    const successfulUploads = info.allEntries
      .filter((entry: any) => entry.status === "success" && entry.cdnUrl)
      .map((entry: any) => entry.cdnUrl as string)
      .filter((url: string) => !images.includes(url)); // Prevent duplicates

    if (successfulUploads.length > 0) {
      onChange([...images, ...successfulUploads]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((url, index) => (
            <div
              key={index}
              className="group relative aspect-video rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={url}
                alt={`Package image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999'%3EError%3C/text%3E%3C/svg%3E";
                }}
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleMoveLeft(index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="size-4 -rotate-90" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleMoveRight(index)}
                  disabled={index === images.length - 1}
                >
                  <ChevronDown className="size-4 -rotate-90" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              {/* First image badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div className="flex justify-center">
        <FileUploaderRegular
          pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || "dbf470d49c954f9f6143"}
          classNameUploader="uc-light uc-gray"
          sourceList="local, camera, url, gdrive, dropbox"
          userAgentIntegration="llm-nextjs"
          filesViewMode="grid"
          useCloudImageEditor={false}
          multiple={true}
          accept="image/*"
          onChange={handleUploadSuccess}
        />
      </div>

      {images.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Upload images to showcase this package. The first image will be used as the cover.
        </p>
      )}
    </div>
  );
}

// Media type selector component
function MediaTypeSelector({
  selected,
  onChange,
}: {
  selected: MediaType[];
  onChange: (types: MediaType[]) => void;
}) {
  const toggle = (type: MediaType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {MEDIA_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center size-10 rounded-lg",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {option.description}
              </div>
            </div>
            {isSelected && (
              <Check className="size-5 text-primary shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
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
  const [initialPackageForm, setInitialPackageForm] = useState<PackageFormData>(defaultPackageForm);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [discardPackageDialogOpen, setDiscardPackageDialogOpen] = useState(false);

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

  // Check if package form has unsaved changes
  const hasPackageChanges = useCallback(() => {
    return (
      packageForm.name !== initialPackageForm.name ||
      packageForm.description !== initialPackageForm.description ||
      packageForm.price !== initialPackageForm.price ||
      packageForm.currency !== initialPackageForm.currency ||
      packageForm.turnaroundDays !== initialPackageForm.turnaroundDays ||
      packageForm.photoCount !== initialPackageForm.photoCount ||
      packageForm.videoMinutes !== initialPackageForm.videoMinutes ||
      packageForm.isActive !== initialPackageForm.isActive ||
      JSON.stringify(packageForm.mediaTypes) !== JSON.stringify(initialPackageForm.mediaTypes) ||
      JSON.stringify(packageForm.features) !== JSON.stringify(initialPackageForm.features) ||
      JSON.stringify(packageForm.images) !== JSON.stringify(initialPackageForm.images)
    );
  }, [packageForm, initialPackageForm]);

  // Package handlers
  const handleCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm(defaultPackageForm);
    setInitialPackageForm(defaultPackageForm);
    setPackageDialogOpen(true);
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    const formData: PackageFormData = {
      name: pkg.name,
      description: pkg.description || "",
      price: (pkg.price / 100).toFixed(2),
      currency: pkg.currency || "usd",
      mediaTypes: pkg.mediaTypes,
      turnaroundDays: pkg.turnaroundDays?.toString() || "",
      photoCount: pkg.photoCount?.toString() || "",
      videoMinutes: pkg.videoMinutes?.toString() || "",
      features: pkg.features || [],
      images: pkg.images || [],
      isActive: pkg.isActive,
    };
    setPackageForm(formData);
    setInitialPackageForm(formData);
    setPackageDialogOpen(true);
  };

  const handlePackageDialogClose = (open: boolean) => {
    if (!open && hasPackageChanges()) {
      setDiscardPackageDialogOpen(true);
    } else {
      setPackageDialogOpen(open);
    }
  };

  const handleDiscardPackageChanges = () => {
    setDiscardPackageDialogOpen(false);
    setPackageDialogOpen(false);
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
      features: packageForm.features.filter(Boolean),
      images: packageForm.images.filter(Boolean),
    };

    if (editingPackage) {
      // For updates: optimistic update with rollback
      const previousPackage = packages.find((p) => p.id === editingPackage.id);
      const optimisticUpdate = { ...editingPackage, ...payload, isActive: packageForm.isActive };
      setPackages((prev) =>
        prev.map((p) => (p.id === editingPackage.id ? optimisticUpdate : p))
      );
      setPackageDialogOpen(false);

      try {
        const updated = await api.packages.update(editingPackage.id, {
          ...payload,
          isActive: packageForm.isActive,
        });
        setPackages((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        toast.success("Package updated successfully");
      } catch (err) {
        console.error("Failed to update package:", err);
        // Restore on error
        if (previousPackage) {
          setPackages((prev) =>
            prev.map((p) => (p.id === editingPackage.id ? previousPackage : p))
          );
        }
        toast.error(
          err instanceof Error ? err.message : "Failed to update package"
        );
      } finally {
        setIsSavingPackage(false);
      }
    } else {
      // For creates: wait for API success before closing dialog
      try {
        const created = await api.packages.create(payload);
        setPackages((prev) => [...prev, created]);
        toast.success("Package created successfully");
        setPackageDialogOpen(false);
      } catch (err) {
        console.error("Failed to create package:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to create package"
        );
      } finally {
        setIsSavingPackage(false);
      }
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

    const payload: CreateAddOnPayload = {
      name: addOnForm.name.trim(),
      description: addOnForm.description.trim() || undefined,
      price: parsePriceInput(addOnForm.price),
      currency: addOnForm.currency,
      category: addOnForm.category,
    };

    if (editingAddOn) {
      // For updates: optimistic update with rollback
      const previousAddOn = addOns.find((a) => a.id === editingAddOn.id);
      const optimisticUpdate = { ...editingAddOn, ...payload, isActive: addOnForm.isActive };
      setAddOns((prev) =>
        prev.map((a) => (a.id === editingAddOn.id ? optimisticUpdate : a))
      );
      setAddOnDialogOpen(false);

      try {
        const updated = await api.packages.updateAddOn(editingAddOn.id, {
          ...payload,
          isActive: addOnForm.isActive,
        });
        setAddOns((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        toast.success("Add-on updated successfully");
      } catch (err) {
        console.error("Failed to update add-on:", err);
        // Restore on error
        if (previousAddOn) {
          setAddOns((prev) =>
            prev.map((a) => (a.id === editingAddOn.id ? previousAddOn : a))
          );
        }
        toast.error(err instanceof Error ? err.message : "Failed to update add-on");
      } finally {
        setIsSavingAddOn(false);
      }
    } else {
      // For creates: wait for API success before closing dialog
      try {
        const created = await api.packages.createAddOn(payload);
        setAddOns((prev) => [...prev, created]);
        toast.success("Add-on created successfully");
        setAddOnDialogOpen(false);
      } catch (err) {
        console.error("Failed to create add-on:", err);
        toast.error(err instanceof Error ? err.message : "Failed to create add-on");
      } finally {
        setIsSavingAddOn(false);
      }
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

    // Optimistically remove from UI
    let deletedPackage: typeof packages[0] | undefined;
    let deletedAddOn: typeof addOns[0] | undefined;

    if (itemToDelete.type === "package") {
      deletedPackage = packages.find((p) => p.id === itemToDelete.id);
      setPackages((prev) => prev.filter((p) => p.id !== itemToDelete.id));
    } else {
      deletedAddOn = addOns.find((a) => a.id === itemToDelete.id);
      setAddOns((prev) => prev.filter((a) => a.id !== itemToDelete.id));
    }
    setDeleteConfirmOpen(false);

    try {
      if (itemToDelete.type === "package") {
        await api.packages.delete(itemToDelete.id);
        toast.success("Package deleted successfully");
      } else {
        await api.packages.deleteAddOn(itemToDelete.id);
        toast.success("Add-on deleted successfully");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      // Restore on error
      if (itemToDelete.type === "package" && deletedPackage) {
        setPackages((prev) => [...prev, deletedPackage]);
      } else if (deletedAddOn) {
        setAddOns((prev) => [...prev, deletedAddOn]);
      }
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
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
                  className={cn(
                    "group hover:shadow-md transition-shadow",
                    !pkg.isActive && "opacity-60"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          {!pkg.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {pkg.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {pkg.mediaTypes.map((type) => {
                            const option = MEDIA_TYPE_OPTIONS.find(o => o.value === type);
                            const Icon = option?.icon || Camera;
                            return (
                              <Badge key={type} variant="outline" className="gap-1.5">
                                <Icon className="size-3" />
                                {option?.label || type}
                              </Badge>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {pkg.turnaroundDays && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-4" />
                              {pkg.turnaroundDays} day turnaround
                            </span>
                          )}
                          {pkg.photoCount && (
                            <span className="flex items-center gap-1.5">
                              <Image className="size-4" />
                              {pkg.photoCount} photos
                            </span>
                          )}
                          {pkg.videoMinutes && (
                            <span className="flex items-center gap-1.5">
                              <Film className="size-4" />
                              {pkg.videoMinutes} min video
                            </span>
                          )}
                          {pkg.features.length > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="size-4" />
                              {pkg.features.length} features
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="text-2xl font-bold text-primary">
                          {formatPrice(pkg.price, pkg.currency)}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPackage(pkg)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
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
              {addOns.map((addOn) => {
                const categoryOption = ADD_ON_CATEGORY_OPTIONS.find(
                  (c) => c.value === addOn.category
                );
                return (
                  <Card
                    key={addOn.id}
                    className={cn(
                      "group hover:shadow-md transition-shadow",
                      !addOn.isActive && "opacity-60"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div className="flex items-center justify-center size-10 rounded-lg bg-muted text-lg shrink-0">
                            {categoryOption?.icon || "✨"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{addOn.name}</h4>
                              {!addOn.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs mb-2">
                              {categoryOption?.label || "Other"}
                            </Badge>
                            {addOn.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {addOn.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="font-semibold text-primary">
                            +{formatPrice(addOn.price, addOn.currency)}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Package Dialog */}
      <Dialog open={packageDialogOpen} onOpenChange={handlePackageDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] !flex !flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Create Package"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Update the package details below."
                : "Fill in the details for your new service package."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="grid gap-6 py-6">
              {/* Basic Info */}
              <div className="space-y-4">
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
                    rows={3}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Pricing</Label>
                <div className="grid gap-2">
                  <div className="flex gap-2">
                    <Select
                      value={packageForm.currency}
                      onValueChange={(value) =>
                        setPackageForm((prev) => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.symbol} {option.label}
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
                        className="pl-8 text-lg font-medium"
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
              </div>

              {/* Media Types */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Media Types *</Label>
                <p className="text-sm text-muted-foreground -mt-2">
                  Select the types of media included in this package
                </p>
                <MediaTypeSelector
                  selected={packageForm.mediaTypes}
                  onChange={(types) =>
                    setPackageForm((prev) => ({ ...prev, mediaTypes: types }))
                  }
                />
              </div>

              {/* Deliverables */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Deliverables</Label>
                <p className="text-sm text-muted-foreground -mt-2">
                  Specify what customers will receive (leave blank if not applicable)
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pkg-turnaround" className="text-sm flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      Turnaround
                    </Label>
                    <div className="relative">
                      <Input
                        id="pkg-turnaround"
                        type="number"
                        min="1"
                        placeholder="—"
                        value={packageForm.turnaroundDays}
                        onChange={(e) =>
                          setPackageForm((prev) => ({
                            ...prev,
                            turnaroundDays: e.target.value,
                          }))
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        days
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pkg-photos" className="text-sm flex items-center gap-2">
                      <Image className="size-4 text-muted-foreground" />
                      Photos
                    </Label>
                    <Input
                      id="pkg-photos"
                      type="number"
                      min="1"
                      placeholder="—"
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
                    <Label htmlFor="pkg-video" className="text-sm flex items-center gap-2">
                      <Film className="size-4 text-muted-foreground" />
                      Video
                    </Label>
                    <div className="relative">
                      <Input
                        id="pkg-video"
                        type="number"
                        min="1"
                        placeholder="—"
                        value={packageForm.videoMinutes}
                        onChange={(e) =>
                          setPackageForm((prev) => ({
                            ...prev,
                            videoMinutes: e.target.value,
                          }))
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        min
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Features</Label>
                <p className="text-sm text-muted-foreground -mt-2">
                  List the key features and benefits of this package
                </p>
                <FeatureListEditor
                  features={packageForm.features}
                  onChange={(features) =>
                    setPackageForm((prev) => ({ ...prev, features }))
                  }
                />
              </div>

              {/* Package Images */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Package Images</Label>
                <p className="text-sm text-muted-foreground -mt-2">
                  Add images to showcase this package. Agents will see these when browsing.
                </p>
                <ImageListEditor
                  images={packageForm.images}
                  onChange={(images) =>
                    setPackageForm((prev) => ({ ...prev, images }))
                  }
                />
              </div>

              {/* Status (only for editing) */}
              {editingPackage && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <Label htmlFor="pkg-active" className="text-base font-medium">Active</Label>
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
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => handlePackageDialogClose(false)}
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

      {/* Discard Package Changes Confirmation */}
      <AlertDialog open={discardPackageDialogOpen} onOpenChange={setDiscardPackageDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardPackageChanges}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        {option.label}
                      </span>
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
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.symbol} {option.label}
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
