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

export enum DayOfWeek {
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY",
  SUNDAY = "SUNDAY",
}

// =============================
// Identity & tenancy
// =============================

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt?: Date | string | null;
  avatarUrl?: string;
  organizationId?: string | null;
  organizationType?: OrgType;
  role?: AccountType;

  // Global identity: how they entered the system / what they can create
  accountType: AccountType;

  // Personal org ID - every user has exactly one personal org
  personalOrgId?: string | null;

  // Server-recommended active org (from bootstrap)
  recommendedActiveOrgId?: string | null;

  // Memberships define what they actually are inside each org
  organizationMemberships?: OrganizationMember[];

  // All accessible org contexts (from bootstrap)
  accessibleOrgs?: Array<{
    orgId: string;
    orgName: string;
    orgType: OrgType;
    relationship: 'member' | 'customer';
    role: string | null;
    logoUrl: string | null;
  }>;
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

/**
 * Represents a COMPANY organization where the current user is a customer.
 * Used by agents to select which provider org should fulfill their order.
 */
export interface CustomerOrganization {
  orgId: string;
  orgName: string;
  orgType: OrgType;
  logoUrl?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  primaryEmail?: string;
  websiteUrl?: string;
  customerId: string;
  createdAt: Date;
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

  // Delivery fields
  deliveryToken?: string | null;
  deliveryEnabledAt?: Date | null;
  clientApprovalStatus?: ClientApprovalStatus;
  clientApprovedAt?: Date | null;

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
  organizationName?: string; // Organization name (for agent view)
  organizationLogoUrl?: string; // Organization logo (for agent view)
  clientName: string;
  customerId?: string;
  customer?: OrganizationCustomer | null; // Full customer object for linked user checks
  projectManagerId?: string | null;
  projectManager?: Pick<User, "id" | "name" | "avatarUrl" | "email"> | null;
  editorId?: string | null;
  editor?: Pick<User, "id" | "name" | "avatarUrl" | "email"> | null;
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
  technician?: Pick<User, "id" | "name" | "avatarUrl" | "email"> | null;
  estimatedDuration: number; // minutes
  requirements: string;
  createdBy: string;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  propertyImage?: string;
  media?: Media[];
  deliveryToken?: string | null;
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

// =============================
// Notifications
// =============================

export type NotificationType =
  | "INVITATION_MEMBER"
  | "INVITATION_CUSTOMER"
  | "PROJECT_ASSIGNED"
  | "NEW_MESSAGE"
  | "PROJECT_APPROVED"
  | "PROJECT_DELIVERED"
  | "CHANGES_REQUESTED"
  | "DELIVERY_COMMENT";

export type ProjectAssignedRole =
  | "TECHNICIAN"
  | "EDITOR"
  | "PROJECT_MANAGER"
  | "CUSTOMER";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  orgId: string;
  orgName: string;
  orgType: OrgType;
  createdAt: Date;
  readAt?: Date | null;

  // For invitation notifications
  invitationId?: string;
  role?: OrgRole;

  // For project assignment notifications
  projectId?: string;
  projectAddress?: string;
  assignedRole?: ProjectAssignedRole;

  // For NEW_MESSAGE notifications
  messagePreview?: string;
  messageChannel?: 'TEAM' | 'CUSTOMER';

  // For PROJECT_APPROVED notifications
  approverName?: string;

  // For PROJECT_DELIVERED notifications
  deliveryToken?: string;
}

export interface OrganizationPublicInfo {
  id: string;
  name: string;
  type: OrgType;
  logoUrl?: string;
  websiteUrl?: string;
  city?: string;
  region?: string;
}

// =============================
// Customer Creation Response
// =============================

export type CustomerCreateResponseType =
  | "customer_created"
  | "invitation_sent"
  | "invitation_pending"
  | "existing_customer"
  | "existing_customer_linked";

export interface CustomerCreateResponse {
  type: CustomerCreateResponseType;
  message?: string;
  customer?: OrganizationCustomer;
  invitationId?: string;
  invitedUser?: {
    id: string;
    name: string;
    email: string;
  };
}

// =============================
// Service Packages & Add-ons
// =============================

export enum AddOnCategory {
  AERIAL = "AERIAL",
  TWILIGHT = "TWILIGHT",
  VIRTUAL_TOUR = "VIRTUAL_TOUR",
  FLOORPLAN = "FLOORPLAN",
  RUSH = "RUSH",
  OTHER = "OTHER",
}

export interface ServicePackage {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  price: number; // Price in cents
  currency: string;
  mediaTypes: MediaType[];
  isActive: boolean;
  displayOrder: number;
  turnaroundDays: number | null;
  photoCount: number | null;
  videoMinutes: number | null;
  features: string[];
  images: string[]; // URLs for package showcase images
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageAddOn {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  price: number; // Price in cents
  currency: string;
  category: AddOnCategory;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePackagePayload {
  name: string;
  description?: string;
  price: number;
  currency: string;
  mediaTypes: MediaType[];
  turnaroundDays?: number;
  photoCount?: number;
  videoMinutes?: number;
  features?: string[];
  images?: string[];
  displayOrder?: number;
}

export interface CreateAddOnPayload {
  name: string;
  description?: string;
  price: number;
  currency: string;
  category: AddOnCategory;
  displayOrder?: number;
}

// =============================
// Delivery Surface
// =============================

export enum ClientApprovalStatus {
  PENDING_REVIEW = "PENDING_REVIEW",
  APPROVED = "APPROVED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
}

export interface DeliveryMedia {
  id: string;
  key: string;
  cdnUrl: string | null;
  filename: string;
  size: number;
  type: MediaType;
  createdAt: Date;
}

export interface DeliveryComment {
  id: string;
  content: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
  };
}

export interface DeliveryResponse {
  project: {
    id: string;
    addressLine1: string | null;
    city: string | null;
    region: string | null;
    scheduledTime: Date;
    status: ProjectStatus;
    clientApprovalStatus: ClientApprovalStatus;
    clientApprovedAt: Date | null;
    deliveryEnabledAt: Date | null;
  };
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryEmail: string | null;
    phone: string | null;
  };
  media: DeliveryMedia[];
  comments: DeliveryComment[];
  customer?: {
    id: string;
    name: string;
    email: string | null;
  };
  canApprove: boolean;
  canComment: boolean;
  /** Whether bulk download is available (requires storage backend) */
  downloadEnabled: boolean;
}

// =============================
// Tours / Onboarding
// =============================

export type TourTrack =
  | "DASHBOARD_OVERVIEW"
  | "JOB_MANAGEMENT"
  | "MESSAGING_CHAT"
  | "SETTINGS_INTEGRATIONS";

export interface TourProgressStep {
  id: string;
  userId: string;
  tourTrack: TourTrack;
  stepId: string;
  completed: boolean;
  completedAt: Date | null;
  skippedAt: Date | null;
  startedAt: Date;
  updatedAt: Date;
}

export interface TourTrackProgressInfo {
  completed: number;
  total: number;
  started: boolean;
  finished: boolean;
}

export interface TourStatusResponse {
  id: string;
  userId: string;
  hasCompletedSetup: boolean;
  dismissedGuide: boolean;
  lastActiveTrack: TourTrack | null;
  createdAt: Date;
  updatedAt: Date;
  trackProgress: Record<TourTrack, TourTrackProgressInfo>;
  overallProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  /** Flag indicating if a demo project exists (for orphan cleanup) */
  hasDemoProject?: boolean;
  /** ID of the demo project if one exists */
  demoProjectId?: string | null;
}

export interface TourTrackProgress {
  tourTrack: TourTrack;
  steps: TourProgressStep[];
  completedCount: number;
  skippedCount: number;
  totalSteps: number;
  isComplete: boolean;
}

export interface UpdateTourProgressRequest {
  tourTrack: TourTrack;
  stepId: string;
  completed?: boolean;
  skipped?: boolean;
}
