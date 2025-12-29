'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { H1, P } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
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
  ImageIcon,
} from 'lucide-react';
import { ServicePackage, PackageAddOn, AddOnCategory, MediaType } from '@/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BorderBeam } from '@/components/ui/border-beam';

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

type SubStep = 'package' | 'addons';

// Package image carousel component
function PackageImageCarousel({ images }: { images: string[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (images.length === 0) {
    return (
      <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="size-8" />
          <span className="text-xs">No images</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent className="ml-0">
          {images.map((url, index) => (
            <CarouselItem key={index} className="pl-0">
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img
                  src={url}
                  alt={`Package image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23f0f0f0" width="400" height="225"/%3E%3Ctext x="200" y="112" text-anchor="middle" dy=".3em" fill="%23999"%3EImage unavailable%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CarouselNext className="right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </Carousel>
      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                api?.scrollTo(index);
              }}
              className={cn(
                'size-1.5 rounded-full transition-all',
                current === index
                  ? 'bg-white w-3'
                  : 'bg-white/50 hover:bg-white/75'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
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

  // Sub-step state: 'package' or 'addons'
  const [subStep, setSubStep] = useState<SubStep>('package');

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
              // If package was already selected, go to add-ons step
              if (ons.length > 0) {
                setSubStep('addons');
              }
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

  const handlePackageContinue = () => {
    if (!selectedPkg) return;
    if (addOns.length > 0) {
      setSubStep('addons');
    } else {
      // No add-ons available, proceed directly
      handleFinalContinue();
    }
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

  const calculateTotal = (): number => {
    if (!selectedPkg) return 0;
    const addOnTotal = addOns.reduce((sum, a) => {
      const qty = addOnQuantities[a.id] || 0;
      return sum + (a.price * qty);
    }, 0);
    return selectedPkg.price + addOnTotal;
  };

  const handleFinalContinue = () => {
    if (!selectedPkg) return;
    // Build add-ons with quantities (only those with qty > 0)
    const addOnsWithQty: AddOnWithQuantity[] = addOns
      .filter(a => (addOnQuantities[a.id] || 0) > 0)
      .map(a => ({ addOn: a, quantity: addOnQuantities[a.id] }));
    const total = calculateTotal();
    onPackageSelect(selectedPkg, addOnsWithQty, total);
  };

  const handleBackFromAddons = () => {
    setSubStep('package');
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
    <div className="flex flex-col h-full container mx-auto px-6 py-8" style={{ maxWidth: '1024px' }}>
      <AnimatePresence mode="wait">
        {subStep === 'package' && (
          <motion.div
            key="package-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="text-center space-y-3 shrink-0 pb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-foreground/90 text-sm mb-2">
                <Package className="h-4 w-4" />
                <span>{providerName}</span>
              </div>
              <H1 className="text-4xl md:text-5xl font-bold text-foreground">
                Choose Your Package
              </H1>
              <P className="text-lg text-muted-foreground">
                Select a photography package for your property
              </P>
            </div>

            {/* Scrollable package cards */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4">
                  {packages.map((pkg) => {
                    const isSelected = selectedPkg?.id === pkg.id;

                    return (
                      <Card
                        key={pkg.id}
                        className={cn(
                          'group cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden',
                          'border-2',
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50'
                        )}
                        onClick={() => handlePackageClick(pkg)}
                      >
                        {/* Image carousel */}
                        {pkg.images && pkg.images.length > 0 && (
                          <PackageImageCarousel images={pkg.images} />
                        )}

                        <CardContent className={cn(
                          "p-6 space-y-4",
                          pkg.images && pkg.images.length > 0 && "pt-4"
                        )}>
                          {isSelected && (
                            <div className="absolute top-2 right-2 z-10">
                              <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                            </div>
                          )}
                          {/* Package name and price */}
                          <div>
                            <h3 className="font-semibold text-xl">{pkg.name}</h3>
                            <div className="text-3xl font-bold text-primary mt-2">
                              {formatPrice(pkg.price, pkg.currency)}
                            </div>
                          </div>

                          {/* Description */}
                          {pkg.description && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <P className="text-sm text-muted-foreground line-clamp-2 cursor-default">{pkg.description}</P>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <p>{pkg.description}</p>
                              </TooltipContent>
                            </Tooltip>
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
                          <div className="pt-2 border-t border-border">
                            {/* Fixed deliverables */}
                            <div className="space-y-1.5">
                              {pkg.turnaroundDays && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="size-4 shrink-0" />
                                  <span>{pkg.turnaroundDays} day turnaround</span>
                                </div>
                              )}
                              {pkg.photoCount && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Camera className="size-4 shrink-0" />
                                  <span>Up to {pkg.photoCount} photos</span>
                                </div>
                              )}
                              {pkg.videoMinutes && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Video className="size-4 shrink-0" />
                                  <span>{pkg.videoMinutes} min video</span>
                                </div>
                              )}
                            </div>
                            {/* Scrollable features list */}
                            {pkg.features.length > 0 && (
                              <div className="mt-2 max-h-24 overflow-y-auto space-y-1.5">
                                {pkg.features.map((feature, i) => (
                                  <Tooltip key={i}>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-default">
                                        <Sparkles className="size-4 shrink-0" />
                                        <span className="truncate">{feature}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                      <p>{feature}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-border shrink-0">
              <div>
                {onBack && (
                  <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-4">
                {selectedPkg && (
                  <div className="text-right">
                    <P className="text-sm text-muted-foreground">Package Price</P>
                    <div className="text-xl font-bold text-foreground">
                      {formatPrice(selectedPkg.price, selectedPkg.currency)}
                    </div>
                  </div>
                )}
                <div className="relative">
                  <Button
                    size="lg"
                    onClick={handlePackageContinue}
                    disabled={!selectedPkg}
                  >
                    {addOns.length > 0 ? 'Continue to Add-ons' : 'Continue'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  {selectedPkg && (
                    <BorderBeam size={40} duration={3} borderWidth={1.5} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {subStep === 'addons' && selectedPkg && (
          <motion.div
            key="addons-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="text-center space-y-3 shrink-0 pb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-foreground/90 text-sm mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{selectedPkg.name}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">{formatPrice(selectedPkg.price, selectedPkg.currency)}</span>
              </div>
              <H1 className="text-4xl md:text-5xl font-bold text-foreground">
                Enhance Your Package
              </H1>
              <P className="text-lg text-muted-foreground">
                Add optional services to your booking
              </P>
            </div>

            {/* Scrollable add-on cards */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 cursor-default">
                                      {addOn.description}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p>{addOn.description}</p>
                                  </TooltipContent>
                                </Tooltip>
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
              </ScrollArea>
            </div>

            {/* Navigation with total */}
            <div className="flex justify-between items-center pt-6 border-t border-border shrink-0">
              <Button variant="outline" onClick={handleBackFromAddons}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Change Package
              </Button>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <P className="text-sm text-muted-foreground">Estimated Total</P>
                  <div className="text-2xl font-bold text-foreground">
                    {formatPrice(total, selectedPkg.currency)}
                  </div>
                </div>
                <div className="relative">
                  <Button size="lg" onClick={handleFinalContinue}>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <BorderBeam size={40} duration={3} borderWidth={1.5} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
