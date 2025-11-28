"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  MapPin,
  Mail,
  Image as ImageIcon,
  Users,
  X,
  Edit,
  Plus,
  Upload,
  CheckCircle2,
  Search,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { H2, Muted } from "@/components/ui/typography";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import { USE_MOCK_DATA } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { StatsCard } from "@/components/shared/dashboard";

interface ServiceArea {
  id: string;
  name: string;
  type: "city" | "region" | "postal" | "radius";
  value: string;
  active: boolean;
}

export default function OrganizationPage() {
  const { user, isLoading } = useRequireRole([
    "ADMIN",
    "PROJECT_MANAGER",
    "dispatcher" as any,
  ]);
  const { memberships, activeOrganizationId } = useOrganizations();
  const activeMembership = useMemo(
    () => memberships.find((m) => m.orgId === activeOrganizationId),
    [memberships, activeOrganizationId]
  );
  const org = activeMembership?.organization;

  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state - initialize from org data
  const [companyName, setCompanyName] = useState(org?.name || "");
  const [companyType, setCompanyType] = useState(org?.type || "");
  const [description, setDescription] = useState(org?.description || "");
  const [logo, setLogo] = useState<string | null>(org?.avatar || null);
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("America/Edmonton");
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsNumber, setSmsNumber] = useState("");
  const [bookingStart, setBookingStart] = useState("09:00");
  const [bookingEnd, setBookingEnd] = useState("17:00");
  const [capacityNotes, setCapacityNotes] = useState("");
  const [travelRadius, setTravelRadius] = useState("");
  const [cancellationWindow, setCancellationWindow] = useState("24");
  const [assignmentStrategy, setAssignmentStrategy] = useState("closest");

  // Initialize form from org data when it loads
  useEffect(() => {
    if (org) {
      setCompanyName(org.name || "");
      setCompanyType(org.type || "");
      setDescription(org.description || "");
      setLogo(org.avatar || null);
    }
  }, [org]);

  const sectionRefs = {
    companyDetails: useRef<HTMLDivElement>(null),
    branding: useRef<HTMLDivElement>(null),
    address: useRef<HTMLDivElement>(null),
    serviceAreas: useRef<HTMLDivElement>(null),
    contact: useRef<HTMLDivElement>(null),
    booking: useRef<HTMLDivElement>(null),
    analytics: useRef<HTMLDivElement>(null),
  };

  const scrollToSection = (section: keyof typeof sectionRefs) => {
    const element = sectionRefs[section].current;
    if (!element) return;

    // Get header height - try CSS variable first, then measure actual header
    const headerHeightVar = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-h')
      .trim();
    
    let headerHeight = 64; // fallback to 4rem (64px)
    
    if (headerHeightVar) {
      // Convert rem to pixels (assuming 16px base font size)
      const remValue = parseFloat(headerHeightVar);
      if (!isNaN(remValue)) {
        headerHeight = remValue * 16;
      }
    }
    
    // Try to measure actual header as fallback
    const headerElement = document.querySelector('header');
    if (headerElement) {
      headerHeight = headerElement.offsetHeight;
    }

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  const handleSave = () => {
    // TODO: Implement save logic with API
    toast.success("Organization settings saved successfully");
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Revert to original org data
    if (org) {
      setCompanyName(org.name || "");
      setCompanyType(org.type || "");
      setDescription(org.description || "");
      setLogo(org.avatar || null);
    }
    toast.info("Changes discarded");
    setHasChanges(false);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  const sections = [
    { id: "companyDetails", label: "Company Details" },
    { id: "branding", label: "Branding" },
    { id: "address", label: "Address & Location" },
    { id: "serviceAreas", label: "Service Areas & Regions" },
    { id: "contact", label: "Contact & Communication" },
    { id: "booking", label: "Booking & Operations" },
    { id: "analytics", label: "Analytics" },
  ];

  // Filter sections based on search
  const filteredSections = searchQuery
    ? sections.filter((s) =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container flex gap-2xl md:gap-3xl w-full mt-md">
          {/* Left Column - Navigation */}
          <aside className="w-64 shrink-0 sticky top-[calc(var(--header-h)+1rem)] h-fit">
            <div className="space-y-2">
              <div className="mb-6">
                <H2 className="text-2xl mb-2">Organization Settings</H2>
                <Muted className="text-sm">
                  Manage your company profile, service areas, and operational
                  preferences.
                </Muted>
              </div>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() =>
                      scrollToSection(section.id as keyof typeof sectionRefs)
                    }
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Column - Content */}
          <div className="@container w-full">
            {/* Search Field */}
            <div className="@container w-full mb-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search settings…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="@container w-full flex flex-col">
              {/* Section 1: Company Details */}
              <section
                ref={sectionRefs.companyDetails}
                id="company-details"
                className="mb-md border-b pb-md"
              >
                {/* Heading */}
                <div className="mb-md flex items-baseline justify-between">
                  <H2 className="text-lg border-0">Company Details</H2>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-lg">
                  {/* Company Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Acme Media Co."
                      />
                      <Muted className="text-xs">
                        Your organization's legal or display name
                      </Muted>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-type">Company Type</Label>
                      <Select
                        value={companyType}
                        onValueChange={(v) => {
                          setCompanyType(v);
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger id="company-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="media_company">
                            Media Company
                          </SelectItem>
                          <SelectItem value="real_estate_team">
                            Real Estate Team
                          </SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Company Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Describe your company, services, and expertise..."
                        rows={4}
                      />
                      <Muted className="text-xs">
                        This description may be visible to clients and partners
                      </Muted>
                    </div>
                  </div>
                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={!hasChanges}>
                      Save Details
                    </Button>
                  </div>
                </div>
              </section>

              {/* Section 2: Branding */}
              <section
                ref={sectionRefs.branding}
                id="branding"
                className="mb-md border-b pb-md"
              >
                {/* Heading */}
                <div className="mb-md flex items-baseline justify-between">
                  <H2 className="text-lg border-0">Branding</H2>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-lg">
                  {/* Company Logo */}
                  <div className="flex flex-col gap-lg">
                    <Label>Company Logo</Label>
                    <div className="flex items-start gap-lg">
                      <div className="shrink-0">
                        {logo ? (
                          <div className="relative">
                            <Avatar className="h-24 w-24 border-2 border-border">
                              <AvatarImage src={logo} />
                              <AvatarFallback>
                                <ImageIcon className="h-12 w-12" />
                              </AvatarFallback>
                            </Avatar>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={() => {
                                setLogo(null);
                                setHasChanges(true);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="h-24 w-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/30">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">
                            Click to upload logo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            PNG, JPG, GIF up to 2MB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Branding Colors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="space-y-2">
                      <Label htmlFor="brand-color">
                        Brand Accent Color (Optional)
                      </Label>
                      <div className="flex gap-3">
                        <Input
                          id="brand-color"
                          type="color"
                          value={brandColor}
                          onChange={(e) => {
                            setBrandColor(e.target.value);
                            setHasChanges(true);
                          }}
                          className="h-10 w-20 p-1 cursor-pointer"
                        />
                        <Input
                          value={brandColor}
                          onChange={(e) => {
                            setBrandColor(e.target.value);
                            setHasChanges(true);
                          }}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                      <Muted className="text-xs">
                        Used for accents and highlights throughout the platform
                      </Muted>
                    </div>
                    <div className="space-y-2">
                      <Label>Color Preview</Label>
                      <div
                        className="h-10 rounded-md border"
                        style={{ backgroundColor: brandColor }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Address & Location */}
              <section
                ref={sectionRefs.address}
                id="address"
                className="mb-md border-b pb-md"
              >
                {/* Heading */}
                <div className="mb-md flex items-baseline justify-between">
                  <H2 className="text-lg border-0">Address & Location</H2>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street-address">Street Address</Label>
                      <Input
                        id="street-address"
                        value={streetAddress}
                        onChange={(e) => {
                          setStreetAddress(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Calgary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state-province">
                        State / Province / Region
                      </Label>
                      <Input
                        id="state-province"
                        value={stateProvince}
                        onChange={(e) => {
                          setStateProvince(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Alberta"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        value={postalCode}
                        onChange={(e) => {
                          setPostalCode(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="T2P 1J4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={country}
                        onValueChange={(v) => {
                          setCountry(v);
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={timezone}
                        onValueChange={(v) => {
                          setTimezone(v);
                          setHasChanges(true);
                        }}
                      >
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
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Map Preview */}
                  <div className="mt-6">
                    <Label>Location Preview</Label>
                    <div className="mt-2 h-48 rounded-lg border bg-muted/30 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Map preview will appear here</p>
                        <p className="text-xs">Once address is saved</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Service Areas & Regions */}
              <section
                ref={sectionRefs.serviceAreas}
                id="service-areas"
                className="mb-md border-b pb-md"
              >
                {/* Heading */}
                <div className="mb-md flex items-baseline justify-between">
                  <H2 className="text-lg border-0">Service Areas & Regions</H2>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-lg">
                  {/* Service Areas */}
                  <div>
                    <Muted className="text-sm">
                      Used to set map defaults and booking rules.
                    </Muted>
                    {serviceAreas.length === 0 ? (
                      <div className="mt-2 py-12 text-center border-2 border-dashed rounded-lg">
                        <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No service areas defined yet
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-4"
                          onClick={() => toast.info("Add service area dialog")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Service Area
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {serviceAreas.map((area) => (
                          <div
                            key={area.id}
                            className="flex items-center gap-4 p-4 border rounded-lg"
                          >
                            <Badge
                              variant={area.active ? "default" : "secondary"}
                            >
                              {area.type}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">{area.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {area.value}
                              </p>
                            </div>
                            <Badge
                              variant={area.active ? "default" : "outline"}
                            >
                              {area.active ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toast.info("Edit service area")}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setServiceAreas(
                                  serviceAreas.filter((a) => a.id !== area.id)
                                );
                                setHasChanges(true);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Service Areas Map Preview */}
                  <div className="mt-6">
                    <Label>Service Coverage Map</Label>
                    <div className="mt-2 h-48 rounded-lg border bg-muted/30 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Service area visualization</p>
                        <p className="text-xs">
                          Will display when areas are defined
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5: Contact & Communication */}
              <section
                ref={sectionRefs.contact}
                id="contact"
                className="mb-md border-b pb-md"
              >
                {/* Heading */}
                <div className="mb-md flex items-baseline justify-between">
                  <H2 className="text-lg border-0">Contact & Communication</H2>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="space-y-2">
                      <Label htmlFor="primary-email">Primary Email</Label>
                      <Input
                        id="primary-email"
                        type="email"
                        value={primaryEmail}
                        onChange={(e) => {
                          setPrimaryEmail(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="operations@company.com"
                      />
                      <Muted className="text-xs">
                        Main contact email for business operations
                      </Muted>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Support Email</Label>
                      <Input
                        id="support-email"
                        type="email"
                        value={supportEmail}
                        onChange={(e) => {
                          setSupportEmail(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="support@company.com"
                      />
                      <Muted className="text-xs">
                        Customer support and inquiries
                      </Muted>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms">SMS Contact Number (Optional)</Label>
                      <Input
                        id="sms"
                        type="tel"
                        value={smsNumber}
                        onChange={(e) => {
                          setSmsNumber(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label>Notification Preferences</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Email Notifications
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Receive updates via email
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            SMS Notifications
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Receive urgent updates via SMS
                          </p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Job Assignment Alerts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Notify when jobs are assigned
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6: Booking & Operations */}
              <section
                ref={sectionRefs.booking}
                id="booking"
                className="mb-md border-b pb-md"
              >
                {/* Heading */}
                <div className="mb-md flex items-baseline justify-between">
                  <H2 className="text-lg border-0">Booking & Operations</H2>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-lg">
                  {/* Booking & Operations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="space-y-2">
                      <Label htmlFor="booking-start">Booking Hours Start</Label>
                      <Input
                        id="booking-start"
                        type="time"
                        value={bookingStart}
                        onChange={(e) => {
                          setBookingStart(e.target.value);
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="booking-end">Booking Hours End</Label>
                      <Input
                        id="booking-end"
                        type="time"
                        value={bookingEnd}
                        onChange={(e) => {
                          setBookingEnd(e.target.value);
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="capacity-notes">
                        Default Capacity Notes
                      </Label>
                      <Textarea
                        id="capacity-notes"
                        value={capacityNotes}
                        onChange={(e) => {
                          setCapacityNotes(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Describe any capacity limits or requirements..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="travel-radius">
                        Travel Radius Default (km)
                      </Label>
                      <Input
                        id="travel-radius"
                        type="number"
                        value={travelRadius}
                        onChange={(e) => {
                          setTravelRadius(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cancellation-window">
                        Job Cancellation Window (hours)
                      </Label>
                      <Select
                        value={cancellationWindow}
                        onValueChange={(v) => {
                          setCancellationWindow(v);
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger id="cancellation-window">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="assignment-strategy">
                        Assignment Strategy
                      </Label>
                      <Select
                        value={assignmentStrategy}
                        onValueChange={(v) => {
                          setAssignmentStrategy(v);
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger id="assignment-strategy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="closest">
                            Closest Technician
                          </SelectItem>
                          <SelectItem value="manual">
                            Manual Assignment Only
                          </SelectItem>
                          <SelectItem value="round_robin">
                            Round Robin
                          </SelectItem>
                          <SelectItem value="availability">
                            Best Availability Match
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* On-site Requirements */}
                  <div className="space-y-3">
                    <Label>On-site Requirements</Label>
                    <div className="space-y-2">
                      {[
                        "Lockbox",
                        "Pets Secured",
                        "Access Code Required",
                        "Parking Available",
                      ].map((req) => (
                        <div key={req} className="flex items-center space-x-2">
                          <Checkbox id={req} />
                          <Label
                            htmlFor={req}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {req}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 7: Analytics */}
              <section
                ref={sectionRefs.analytics}
                id="analytics"
                className="mb-md"
              >
                {/* Heading */}
                <div className="mb-md flex items-baseline justify-between">
                  <H2 className="text-lg border-0">Analytics</H2>
                </div>

                {USE_MOCK_DATA ? (
                  <AnalyticsContent />
                ) : (
                  <div className="py-12 text-center border-2 border-dashed rounded-lg">
                    <Muted className="text-sm">
                      Analytics data will appear here when available
                    </Muted>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
            <div className="container mx-auto px-md py-4">
              <div className="flex items-center justify-between max-w-5xl mx-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>You have unsaved changes</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </article>
    </main>
  );
}

// Analytics Content Component
function AnalyticsContent() {
  // Mock data - revenue per month
  const revenuePerMonth = USE_MOCK_DATA
    ? [
        { month: "Jan 2025", revenue: 71500 },
        { month: "Feb 2025", revenue: 69200 },
        { month: "Mar 2025", revenue: 75000 },
        { month: "Apr 2025", revenue: 82000 },
        { month: "May 2025", revenue: 87000 },
        { month: "Jun 2025", revenue: 105000 },
        { month: "Jul 2025", revenue: 115400 },
        { month: "Aug 2025", revenue: 112500 },
        { month: "Sep 2025", revenue: 99500 },
        { month: "Oct 2025", revenue: 91000 },
        { month: "Nov 2025", revenue: 86000 },
      ]
    : [];

  // Mock data - order total distribution
  // Adjusted ranges to fit AOV of ~$800
  const orderDistribution = USE_MOCK_DATA
    ? [
        { range: "0-250", count: 13 },
        { range: "250-500", count: 34 },
        { range: "500-750", count: 86 },
        { range: "750-1000", count: 130 },
        { range: "1000-1250", count: 75 },
        { range: "1250-1500", count: 24 },
        { range: "1500-1750", count: 9 },
        { range: "1750-2000", count: 3 },
        { range: "2000+", count: 1 },
      ]
    : [];

  // Calculate totals
  const totalRevenue = USE_MOCK_DATA
    ? revenuePerMonth.reduce((sum, item) => sum + item.revenue, 0)
    : 0;
  const averageOrderTotal = USE_MOCK_DATA ? 800.85 : 0;
  const previousMonthAverage = USE_MOCK_DATA ? 420.69 : 0;
  const trendPercentage = USE_MOCK_DATA
    ? ((averageOrderTotal - previousMonthAverage) / previousMonthAverage) * 100
    : 0;

  const revenueChartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(142, 76%, 36%)",
    },
  };

  const orderChartConfig = {
    count: {
      label: "Count",
      color: "hsl(217, 91%, 60%)",
    },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Summary */}
        <StatsCard
          icon={DollarSign}
          value={totalRevenue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          valuePrefix="$"
          label="Revenue"
          iconBgColor="bg-accent"
          iconColor="text-primary"
          description="Note: date filtering on these metrics filter based on the completion date of payments in UTC time."
        />

        {/* Order Total Summary */}
        <StatsCard
          icon={TrendingUp}
          value={averageOrderTotal.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          label="Average Order Value"
          iconBgColor="bg-accent"
          iconColor="text-primary"
          description="Note: date filtering on these metrics filter based on the creation date of orders in UTC time."
          trendPercentage={Number(trendPercentage.toFixed(2))}
          valuePrefix="$"
          previousValue={Number(previousMonthAverage.toFixed(2))}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Per Month Chart */}
        <StatsCard
          type="chart"
          icon={DollarSign}
          value={totalRevenue.toLocaleString("en-US", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          label="Revenue Per Month"
          chartConfig={revenueChartConfig}
          chart={
            <BarChart accessibilityLayer data={revenuePerMonth}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              {/* <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value / 1000}k`}
              /> */}
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4}>
                {/* <LabelList
                  position="top"
                  offset={12}
                  fill="var(--color-revenue)"
                  fontSize={12}
                /> */}
              </Bar>
            </BarChart>
          }
        />

        {/* Order Total Distribution Chart */}
        <StatsCard
          type="chart"
          icon={TrendingUp}
          value={averageOrderTotal.toFixed(2)}
          label="Order Total Distribution"
          chartConfig={orderChartConfig}
          chart={
            <BarChart data={orderDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="range"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              {/* <YAxis tick={{ fontSize: 12 }} /> */}
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                <LabelList position="top" offset={12} fill="var(--color-count)" fontSize={12} />
              </Bar>
            </BarChart>
          }
        />
      </div>
    </div>
  );
}
