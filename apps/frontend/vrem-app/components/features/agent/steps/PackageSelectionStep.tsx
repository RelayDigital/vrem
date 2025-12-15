'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { H1, P } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Clock,
  Camera,
  Video,
  Sparkles,
  Plus,
  Minus,
} from 'lucide-react';
import { ServicePackage, PackageAddOn, AddOnCategory, MediaType } from '@/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Add-on with quantity for the booking flow
export interface AddOnWithQuantity {
  addOn: PackageAddOn;
  quantity: number;
}

interface PackageSelectionStepProps {
  providerOrgId: string;
  providerName: string;
  selectedPackageId?: string;
  selectedAddOnQuantities?: Record<string, number>; // addOnId -> quantity
  onPackageSelect: (pkg: ServicePackage, addOnsWithQty: AddOnWithQuantity[], total: number) => void;
  onBack?: () => void;
}

function formatPrice(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function getMediaTypeIcon(type: MediaType) {
  switch (type) {
    case MediaType.PHOTO:
      return Camera;
    case MediaType.VIDEO:
      return Video;
    default:
      return Camera;
  }
}

function getAddOnCategoryLabel(category: AddOnCategory): string {
  switch (category) {
    case AddOnCategory.AERIAL:
      return 'Aerial';
    case AddOnCategory.TWILIGHT:
      return 'Twilight';
    case AddOnCategory.VIRTUAL_TOUR:
      return '3D Tour';
    case AddOnCategory.FLOORPLAN:
      return 'Floor Plan';
    case AddOnCategory.RUSH:
      return 'Rush';
    default:
      return 'Add-on';
  }
}

export function PackageSelectionStep({
  providerOrgId,
  providerName,
  selectedPackageId,
  selectedAddOnQuantities = {},
  onPackageSelect,
  onBack,
}: PackageSelectionStepProps) {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addOns, setAddOns] = useState<PackageAddOn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  // Map of addOnId -> quantity (0 means not selected)
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>(selectedAddOnQuantities);

  useEffect(() => {
    let cancelled = false;

    const fetchPackages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [pkgs, ons] = await Promise.all([
          api.packages.getForOrg(providerOrgId),
          api.packages.getAddOnsForOrg(providerOrgId),
        ]);

        if (!cancelled) {
          setPackages(pkgs);
          setAddOns(ons);

          // Pre-select if there was a previous selection
          if (selectedPackageId) {
            const pkg = pkgs.find(p => p.id === selectedPackageId);
            if (pkg) {
              setSelectedPkg(pkg);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch packages:', err);
        if (!cancelled) {
          setError('Failed to load packages. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPackages();

    return () => {
      cancelled = true;
    };
  }, [providerOrgId, selectedPackageId]);

  const handlePackageClick = (pkg: ServicePackage) => {
    setSelectedPkg(pkg);
  };

  const handleQuantityChange = (addOnId: string, delta: number) => {
    setAddOnQuantities(prev => {
      const current = prev[addOnId] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [addOnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addOnId]: newQty };
    });
  };

  const setQuantity = (addOnId: string, qty: number) => {
    setAddOnQuantities(prev => {
      const newQty = Math.max(0, qty);
      if (newQty === 0) {
        const { [addOnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addOnId]: newQty };
    });
  };

  const calculateTotal = (): number => {
    if (!selectedPkg) return 0;
    const addOnTotal = addOns.reduce((sum, a) => {
      const qty = addOnQuantities[a.id] || 0;
      return sum + (a.price * qty);
    }, 0);
    return selectedPkg.price + addOnTotal;
  };

  const handleContinue = () => {
    if (!selectedPkg) return;
    // Build add-ons with quantities (only those with qty > 0)
    const addOnsWithQty: AddOnWithQuantity[] = addOns
      .filter(a => (addOnQuantities[a.id] || 0) > 0)
      .map(a => ({ addOn: a, quantity: addOnQuantities[a.id] }));
    const total = calculateTotal();
    onPackageSelect(selectedPkg, addOnsWithQty, total);
  };

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        key="package-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center container mx-auto px-6 py-12 h-full"
      >
        <div
          className="w-full container mx-auto space-y-8"
          style={{ maxWidth: '1024px' }}
        >
          <div className="text-center space-y-3">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-12 w-96 mx-auto" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        key="package-error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center container mx-auto px-6 py-12 h-full"
      >
        <div
          className="w-full container mx-auto space-y-8 text-center"
          style={{ maxWidth: '896px' }}
        >
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <H1 className="text-2xl">{error}</H1>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </motion.div>
    );
  }

  // Empty state - no packages
  if (packages.length === 0) {
    return (
      <motion.div
        key="package-empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center container mx-auto px-6 py-12 h-full"
      >
        <div
          className="w-full container mx-auto space-y-8"
          style={{ maxWidth: '896px' }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <H1 className="text-3xl md:text-4xl font-bold text-foreground">
              No Packages Available
            </H1>
            <P className="text-lg text-muted-foreground max-w-md mx-auto">
              {providerName} has not set up any service packages yet. Please contact them directly to book services.
            </P>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Choose Another Provider
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  const total = calculateTotal();

  return (
    <motion.div
      key="package-selection"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center container mx-auto px-6 py-12 min-h-full"
    >
      <div
        className="w-full container mx-auto space-y-8"
        style={{ maxWidth: '1024px' }}
      >
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-foreground/90 text-sm mb-2">
            <Package className="h-4 w-4" />
            <span>{providerName}</span>
          </div>
          <H1 className="text-4xl md:text-5xl font-bold text-foreground">
            Choose Your Package
          </H1>
          <P className="text-lg text-muted-foreground">
            Select a photography package and optional add-ons
          </P>
        </motion.div>

        {/* Package cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {packages.map((pkg) => {
            const isSelected = selectedPkg?.id === pkg.id;

            return (
              <Card
                key={pkg.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md relative',
                  'border-2',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => handlePackageClick(pkg)}
              >
                {isSelected && (
                  <div className="absolute -top-3 -right-3">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                )}
                <CardContent className="p-6 space-y-4">
                  {/* Package name and price */}
                  <div>
                    <h3 className="font-semibold text-xl">{pkg.name}</h3>
                    <div className="text-3xl font-bold text-primary mt-2">
                      {formatPrice(pkg.price, pkg.currency)}
                    </div>
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <P className="text-sm text-muted-foreground">{pkg.description}</P>
                  )}

                  {/* Media types */}
                  <div className="flex flex-wrap gap-2">
                    {pkg.mediaTypes.map((type) => {
                      const Icon = getMediaTypeIcon(type);
                      return (
                        <Badge key={type} variant="secondary" className="gap-1">
                          <Icon className="h-3 w-3" />
                          {type}
                        </Badge>
                      );
                    })}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    {pkg.turnaroundDays && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{pkg.turnaroundDays} day turnaround</span>
                      </div>
                    )}
                    {pkg.photoCount && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Camera className="h-4 w-4" />
                        <span>Up to {pkg.photoCount} photos</span>
                      </div>
                    )}
                    {pkg.videoMinutes && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Video className="h-4 w-4" />
                        <span>{pkg.videoMinutes} min video</span>
                      </div>
                    )}
                    {pkg.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Add-ons section */}
        {addOns.length > 0 && selectedPkg && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-center">Optional Add-ons</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {addOns.map((addOn) => {
                const quantity = addOnQuantities[addOn.id] || 0;
                const isSelected = quantity > 0;
                return (
                  <Card
                    key={addOn.id}
                    className={cn(
                      'transition-all duration-200',
                      'border',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{addOn.name}</span>
                            <span className="font-semibold text-primary">
                              +{formatPrice(addOn.price, addOn.currency)}
                            </span>
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {getAddOnCategoryLabel(addOn.category)}
                          </Badge>
                          {addOn.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {addOn.description}
                            </p>
                          )}
                        </div>
                        {/* Quantity controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-sm text-muted-foreground">Quantity</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(addOn.id, -1);
                              }}
                              disabled={quantity === 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(addOn.id, 1);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-right text-sm font-medium text-primary">
                            Subtotal: {formatPrice(addOn.price * quantity, addOn.currency)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Total and Navigation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-4 pt-6 border-t border-border"
        >
          {selectedPkg && (
            <div className="text-center">
              <P className="text-muted-foreground">Estimated Total</P>
              <div className="text-4xl font-bold text-foreground">
                {formatPrice(total, selectedPkg.currency)}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={!selectedPkg}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
