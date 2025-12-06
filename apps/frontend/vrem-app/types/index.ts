// =============================
// Core enums & basic types
// =============================

export type AccountType = "AGENT" | "PROVIDER" | "COMPANY";

export type OrgType = "PERSONAL" | "TEAM" | "COMPANY";

export type OrgRole =
  | "OWNER"
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "TECHNICIAN"
  | "EDITOR"
  | "AGENT"
  | "VIEWER";

export enum ProjectStatus {
  BOOKED = "BOOKED",
  SHOOTING = "SHOOTING",
  EDITING = "EDITING",
  DELIVERED = "DELIVERED",
}

export enum MediaType {
  PHOTO = "PHOTO",
  VIDEO = "VIDEO",
  FLOORPLAN = "FLOORPLAN",
  DOCUMENT = "DOCUMENT",
}

// =============================
// Identity & tenancy
// =============================

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  organizationId?: string | null;
  organizationType?: OrgType;
  role?: AccountType;

  // Global identity: how they entered the system / what they can create
  accountType: AccountType;

  // Memberships define what they actually are inside each org
  organizationMemberships?: OrganizationMember[];
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType; // PERSONAL | TEAM | COMPANY
  createdAt: Date;
  // Optional metadata / branding / geography
  avatar?: string;
  description?: string;
  services?: string[];
  technicianCount?: number;
  rating?: number;
  reviewCount?: number;
  coverageArea?: string[];
  legalName?: string;
  slug?: string;
  logoUrl?: string;
  websiteUrl?: string;
  phone?: string;
  primaryEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  serviceArea?: any;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  user: User;
  orgId: string;
  organization: Organization;
  orgRole: OrgRole;
  createdAt: Date;
  role?: OrgRole;
  personalOrg?: Organization | null;
}

export interface OrganizationCustomer {
  id: string;
  orgId: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================
// Vendor & applications
// =============================

export interface PreferredVendor {
  agentId: string; // User.id (accountType = "AGENT")
  vendorId: string; // Organization.id (type = "COMPANY")
  vendorName: string;
  addedAt: Date;
  priority: number; // 1 = highest
}

export interface CompanyApplication {
  id: string;
  userId: string; // User.id (starts as PROVIDER)
  userName: string;
  companyId: string; // Organization.id (type = "COMPANY")
  companyName: string;
  status: "pending" | "approved" | "rejected";
  message?: string;
  appliedAt: Date;
  reviewedAt?: Date;
}

// =============================
// Core project & media domain
// =============================

export interface CalendarEvent {
  id: string;
  projectId: string;
  cronofyEventId: string;
  calendarId: string;
  createdAt: Date;
}

export interface Media {
  id: string;
  projectId: string;
  key: string;
  cdnUrl?: string;
  filename: string;
  size: number;
  type: MediaType;
  createdAt: Date;
}

export interface Message {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  timestamp: Date;
  channel: 'TEAM' | 'CUSTOMER';
  thread?: string | null;

  user?: User;
}

export interface Project {
  id: string;
  orgId: string; // tenant boundary
  customerId?: string | null;
  address?: {
    latitude?: number;
    longitude?: number;
    street_number?: string;
    street_name?: string;
    unit_number?: string;
    postal_code?: string;
    city?: string;
    state_or_province?: string;
    country?: string;
    unparsed_address?: string;
    [key: string]: any;
  };
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  scheduledTime: Date;
  status: ProjectStatus;
  technicianId?: string;
  editorId?: string;
  projectManagerId?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Optional expansions
  calendarEvent?: CalendarEvent | null;
  media?: Media[];
  messages?: Message[];
  editor?: User;
  technician?: User;
  projectManager?: User | null;
  organization?: Organization;
  customer?: OrganizationCustomer | null;
}

// Project with relations always present (for places that expect them)
export interface ProjectAggregate extends Project {
  media: Media[];
  messages: Message[];
  calendarEvent?: CalendarEvent | null;
}

// =============================
// Provider view model
// =============================

/**
 * ProviderProfile is a view-model for "this user as a provider in this org".
 * It is derived from User + OrganizationMember + metrics/profile.
 */
export interface ProviderProfile {
  id: string; // alias for userId
  userId: string;
  orgMemberId: string;
  orgId: string; // org being viewed (PERSONAL or COMPANY)
  role: OrgRole;
  memberId?: string;
  organizationId?: string;

  name: string;
  email: string;
  phone: string;

  // true if they effectively operate under their PERSONAL org only
  isIndependent: boolean;

  // If they are working within a COMPANY org, these identify that org
  companyId?: string;
  companyName?: string;

  homeLocation: {
    lat: number;
    lng: number;
    address: {
      street?: string;
      city: string;
      stateProvince: string;
      country: string;
      postalCode?: string;
    };
  };

  availability: {
    date: string; // ISO date string
    available: boolean;
  }[];

  reliability: {
    totalJobs: number;
    noShows: number;
    lateDeliveries: number;
    onTimeRate: number; // 0–1 or 0–100, be consistent across app
    averageDeliveryTime: number; // hours
  };

  skills: {
    residential: number;
    commercial: number;
    aerial: number;
    twilight: number;
    video: number;
  };

  rating: {
    overall: number;
    count: number;
    recent: number[]; // last N ratings
  };

  preferredClients: string[]; // Organization.id list
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  avatar?: string;
  bio?: string;

  services: {
    photography: boolean;
    video: boolean;
    aerial: boolean;
    floorplan: boolean;
    measurement: boolean;
    twilight: boolean;
    editing: boolean;
    virtualStaging: boolean;
  };

  portfolio?: string[];
  certifications?: string[];
}

export interface ProviderRanking {
  provider: ProviderProfile;
  score: number;
  factors: {
    availability: number;
    distance: number;
    distanceKm: number;
    reliability: number;
    skillMatch: number;
    preferredRelationship: number;
    [key: string]: number;
  };
  recommended: boolean;
}

// Legacy aliases to ease migration from Technician naming
export type Technician = ProviderProfile;
export type TechnicianProfile = ProviderProfile;
export type Provider = ProviderProfile;
export type TechnicianRanking = ProviderRanking;
export type Customer = OrganizationCustomer;

// =============================
// Job / UI view models
// =============================

/**
 * View-model used by job card/list UIs.
 * Canonical data should always come from Project.
 */
export interface JobRequest {
  id: string;
  orderNumber: string;
  organizationId: string; // maps to Project.orgId
  clientName: string;
  customerId?: string;
  projectManagerId?: string | null;
  editorId?: string | null;
  propertyAddress: string;
  address?: any;

  location: {
    lat: number;
    lng: number;
  };

  scheduledDate: string; // ISO date string
  scheduledTime: string; // "HH:mm" local time string

  mediaType: ("photo" | "video" | "aerial" | "twilight")[];

  priority: "standard" | "rush" | "urgent";

  status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "editing"
    | "delivered"
    | "cancelled";

  assignedTechnicianId?: string;
  estimatedDuration: number; // minutes
  requirements: string;
  createdBy: string;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  propertyImage?: string;
}

export interface JobDetails {
  clientName: string;
  scheduledDate: string;
  scheduledTime: string;
  mediaTypes: string[];
  priority: "standard" | "rush" | "urgent";
  estimatedDuration: number;
  requirements: string;
}

// =============================
// Audit log
// =============================

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  organizationId: string;
  action: string;
  resourceType: "job" | "provider" | "organization" | "user";
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
}

// =============================
// Metrics / Analytics DTOs
// =============================

export interface Metrics {
  organizationId: string;
  period: "today" | "week" | "month";
  jobs: {
    total: number;
    pending: number;
    assigned: number;
    completed: number;
    cancelled: number;
  };
  technicians: {
    active: number;
    available: number;
    utilization: number;
  };
  performance: {
    averageAssignmentTime: number; // minutes
    averageDeliveryTime: number; // hours
    onTimeRate: number; // 0–1 or 0–100, pick one convention
    clientSatisfaction: number;
  };
  revenue: {
    total: number;
    perJob: number;
  };
}

export interface AnalyticsSummary {
  period: "today" | "week" | "month";
  jobs: Metrics["jobs"];
  technicians: Metrics["technicians"];
  revenue: Metrics["revenue"];
  performance: Metrics["performance"];
}

// =============================
// Marketplace
// =============================

export interface MarketplaceJob {
  id: string;
  title: string;
  description: string;
  location?: string;
  compensation: number;
  currency: string;
  status: "open" | "assigned" | "closed";
  orgId: string; // org that posted the job
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string; // User.id
  coverLetter?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

// =============================
// Transactions
// =============================

export interface Transaction {
  id: string;
  jobId?: string;
  orgId: string; // org that pays or is charged
  amount: number;
  currency: string;
  type: "payout" | "charge";
  status: "pending" | "completed" | "failed";
  createdAt: Date;
}
