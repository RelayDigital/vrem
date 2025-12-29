'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { H1, H2, P, Muted } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  MapPin,
  Globe,
  Mail,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { CustomerOrganization } from '@/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ProviderStepProps {
  selectedProviderId?: string;
  onProviderSelect: (provider: CustomerOrganization) => void;
  onBack?: () => void;
}

export function ProviderStep({
  selectedProviderId,
  onProviderSelect,
  onBack,
}: ProviderStepProps) {
  const [providers, setProviders] = useState<CustomerOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProviders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Clear org header for this request - /me/customer-organizations is user-scoped,
        // not org-scoped. Agents may have a stale org ID in localStorage that they don't belong to.
        const previousOrgId = api.organizations.getActiveOrganization();
        api.organizations.setActiveOrganization(null);
        
        const orgs = await api.me.customerOrganizations();
        
        // Restore previous org ID after the request
        if (previousOrgId) {
          api.organizations.setActiveOrganization(previousOrgId);
        }
        
        if (!cancelled) {
          setProviders(orgs);
        }
      } catch (err) {
        console.error('Failed to fetch provider organizations:', err);
        if (!cancelled) {
          setError('Failed to load service providers. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewDetails = (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Open in new tab to allow user to review without losing their place
    window.open(`/organizations/${orgId}/public`, '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        key="provider-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center container mx-auto px-6 py-12 h-full"
      >
        <div
          className="w-full container mx-auto space-y-8"
          style={{ maxWidth: '896px' }}
        >
          <div className="text-center space-y-3">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-12 w-96 mx-auto" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
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
        key="provider-error"
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
          <H2>{error}</H2>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </motion.div>
    );
  }

  // Empty state - no providers
  if (providers.length === 0) {
    return (
      <motion.div
        key="provider-empty"
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
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <H1 className="text-3xl md:text-4xl font-bold text-foreground">
              No Service Providers Yet
            </H1>
            <P className="text-lg text-muted-foreground max-w-md mx-auto">
              You are not yet a customer of any media companies. You must be
              added as a customer by a company before you can place orders here.
            </P>
            <div className="pt-4 border-t border-border mt-6">
              <Muted className="text-sm max-w-lg mx-auto">
                <span className="font-medium text-foreground/80">Coming Soon:</span>{' '}
                An open marketplace where you can place orders without needing to be part of a
                company organization. Providers will be automatically matched and assigned to
                fulfill your orders based on availability and location.
              </Muted>
            </div>
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
                Go Back
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Provider selection
  return (
    <motion.div
      key="provider"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center container mx-auto px-6 py-12 h-full"
    >
      <div
        className="w-full container mx-auto space-y-8"
        style={{ maxWidth: '896px' }}
      >
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-foreground/90 text-sm mb-2">
            <Building2 className="h-4 w-4" />
            <span>Select Your Media Company</span>
          </div>
          <H1 className="text-4xl md:text-5xl font-bold text-foreground">
            Who should handle this shoot?
          </H1>
          <P className="text-lg text-muted-foreground">
            Choose a media company to fulfill your order
          </P>
        </motion.div>

        {/* Provider cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {providers.map((provider) => {
            const isSelected = selectedProviderId === provider.orgId;
            const location = [provider.city, provider.region, provider.countryCode]
              .filter(Boolean)
              .join(', ');

            return (
              <Card
                key={provider.orgId}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md',
                  'border-2',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => onProviderSelect(provider)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Logo / Avatar */}
                    <div className="flex-shrink-0">
                      {provider.logoUrl ? (
                        <img
                          src={provider.logoUrl}
                          alt={provider.orgName}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-7 w-7 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg truncate">
                          {provider.orgName}
                        </h3>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>

                      {location && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{location}</span>
                        </div>
                      )}

                      {provider.primaryEmail && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{provider.primaryEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleViewDetails(provider.orgId, e)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      View Details
                    </Button>

                    {provider.websiteUrl && (
                      <a
                        href={provider.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center pt-4"
        >
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

