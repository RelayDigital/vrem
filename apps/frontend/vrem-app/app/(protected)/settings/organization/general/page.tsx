"use client";

import { useState, useEffect } from "react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { TeamLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { AccessDenied } from "@/components/common/AccessDenied";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { H2, Muted } from "@/components/ui/typography";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { geocodeAddress } from "@/lib/technicians";

export default function OrganizationGeneralPage() {
  const {
    user,
    isLoading: roleLoading,
    isAllowed,
  } = useRoleGuard(["dispatcher", "DISPATCHER", "PROJECT_MANAGER"]);
  const { organization, isLoading, isSaving, error, save, reload } =
    useOrganizationSettings();

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [timezone, setTimezone] = useState("");

  // Initialize form from organization data
  useEffect(() => {
    if (organization) {
      setDisplayName(organization.name || "");
      setLegalName((organization as any).legalName || "");
      setWebsiteUrl((organization as any).websiteUrl || "");
      setPrimaryEmail((organization as any).primaryEmail || "");
      setPhone((organization as any).phone || "");
      setAddressLine1((organization as any).addressLine1 || "");
      setAddressLine2((organization as any).addressLine2 || "");
      setCity((organization as any).city || "");
      setRegion((organization as any).region || "");
      setPostalCode((organization as any).postalCode || "");
      setCountryCode((organization as any).countryCode || "");
      setLat(
        (organization as any).lat !== undefined &&
          (organization as any).lat !== null
          ? String((organization as any).lat)
          : ""
      );
      setLng(
        (organization as any).lng !== undefined &&
          (organization as any).lng !== null
          ? String((organization as any).lng)
          : ""
      );
      setTimezone((organization as any).timezone || "");
    }
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const fullAddress = [
        addressLine1,
        addressLine2,
        city,
        region,
        postalCode,
        countryCode,
      ]
        .filter(Boolean)
        .join(", ");

      let nextLat = lat ? parseFloat(lat) : undefined;
      let nextLng = lng ? parseFloat(lng) : undefined;
      const needsGeocode =
        (!nextLat && nextLat !== 0) || (!nextLng && nextLng !== 0);

      if (fullAddress && needsGeocode) {
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          nextLat = coords.lat;
          nextLng = coords.lng;
          setLat(String(coords.lat));
          setLng(String(coords.lng));
        } else {
          toast.error(
            "Unable to geocode address. Please confirm the address or enter coordinates manually."
          );
        }
      }

      await save({
        name: displayName,
        legalName: legalName || undefined,
        websiteUrl: websiteUrl || undefined,
        primaryEmail: primaryEmail || undefined,
        phone: phone || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        region: region || undefined,
        postalCode: postalCode || undefined,
        countryCode: countryCode || undefined,
        lat: nextLat,
        lng: nextLng,
        timezone: timezone || undefined,
      } as any);
      toast.success("Organization settings saved successfully");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save organization settings"
      );
    }
  };

  if (roleLoading) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by parent layout
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view organization settings. Please contact your administrator."
      />
    );
  }

  const showFormSkeleton = isLoading && !organization;

  return (
    <SettingsRightContentSection
      id="organization-general"
      title="Organization General"
      description="Manage your organization profile and contact information."
    >
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load organization settings</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error.message}</span>
            <Button variant="secondary" size="sm" onClick={() => reload()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showFormSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`org-form-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
      <form onSubmit={handleSubmit}>
        {/* General Information */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-md border-b pb-md">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Acme Media Co."
              required
            />
            <Muted className="text-xs">Your organization's display name</Muted>
          </div>

          {/* Legal Name */}
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal Name</Label>
            <Input
              id="legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Acme Media Company Inc."
            />
            <Muted className="text-xs">
              Official legal name of your organization
            </Muted>
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Primary Email */}
          <div className="space-y-2">
            <Label htmlFor="primaryEmail">Primary Email</Label>
            <Input
              id="primaryEmail"
              type="email"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite 100"
            />
          </div>

          {/* City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Calgary"
              />
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label htmlFor="region">Region / State / Province</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Alberta"
              />
            </div>
          </div>

        {/* Postal Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="T2P 1J4"
            />
          </div>

          {/* Country Code */}
          <div className="space-y-2">
            <Label htmlFor="countryCode">Country Code</Label>
            <Input
              id="countryCode"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              placeholder="CA"
            />
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude (optional)</Label>
            <Input
              id="lat"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="51.0447"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lng">Longitude (optional)</Label>
            <Input
              id="lng"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-114.0719"
            />
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Edmonton">
                  America/Edmonton (MST)
                </SelectItem>
                <SelectItem value="America/Toronto">
                  America/Toronto (EST)
                </SelectItem>
                <SelectItem value="America/Vancouver">
                  America/Vancouver (PST)
                </SelectItem>
                <SelectItem value="America/New_York">
                  America/New_York (EST)
                </SelectItem>
                <SelectItem value="America/Chicago">
                  America/Chicago (CST)
                </SelectItem>
                <SelectItem value="America/Denver">
                  America/Denver (MST)
                </SelectItem>
                <SelectItem value="America/Los_Angeles">
                  America/Los_Angeles (PST)
                </SelectItem>
                <SelectItem value="America/Phoenix">
                  America/Phoenix (MST)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reload()}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
      )}
    </SettingsRightContentSection>
  );
}
