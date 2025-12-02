export interface Organization {
  id: string;
  name: string;
  type: "COMPANY" | "PERSONAL";
  createdAt: Date;
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
  timezone?: string;
  serviceArea?: any;
}

export interface PreferredVendor {
  agentId: string;
  vendorId: string; // Organization ID of media company
  vendorName: string;
  addedAt: Date;
  priority: number; // 1 = highest
}

export interface CompanyApplication {
  id: string;
  technicianId: string;
  technicianName: string;
  companyId: string;
  companyName: string;
  status: "pending" | "approved" | "rejected";
  message?: string;
  appliedAt: Date;
  reviewedAt?: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "DISPATCHER" | "TECHNICIAN" | "AGENT";
  organizationId: string;
  organizationType?: "COMPANY" | "PERSONAL";
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

// Backwards compatibility alias
export type Customer = OrganizationCustomer;

export interface Technician {
  id: string;
  memberId?: string;
  name: string;
  email: string;
  phone: string;
  organizationId: string;
  role?: OrganizationMember['role'];
  isIndependent: boolean;
  companyId?: string; // ID of media company they work for
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
    date: string;
    available: boolean;
  }[];
  reliability: {
    totalJobs: number;
    noShows: number;
    lateDeliveries: number;
    onTimeRate: number;
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
    recent: number[]; // last 10 ratings
  };
  preferredClients: string[]; // client organization IDs
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  avatar?: string;
  bio?: string;
  services: {
    photography: boolean;
    video: boolean;
    aerial: boolean;
    twilight: boolean;
    editing: boolean;
    virtualStaging: boolean;
  };
  portfolio?: string[];
  certifications?: string[];
}

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

export interface OrganizationMember {
  id: string;
  userId: string;
  orgId: string;
  role:
    | "OWNER"
    | "ADMIN"
    | "DISPATCHER"
    | "TECHNICIAN"
    | "EDITOR"
    | "PROJECT_MANAGER";
  createdAt: Date;
  organization?: Organization;
  user?: User;
  personalOrg?: Organization | null;
}

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
  user?: User;
}

export interface Project {
  id: string;
  customerId?: string | null;
  address: string;
  notes?: string;
  scheduledTime: Date;
  status: ProjectStatus;
  technicianId?: string;
  editorId?: string;
  projectManagerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
  calendarEvent?: CalendarEvent | null;
  media?: Media[];
  messages?: Message[];
  editor?: User;
  technician?: User;
  projectManager?: User | null;
  organization?: Organization;
  customer?: OrganizationCustomer | null;
}

export interface ProjectAggregate extends Project {
  media: Media[];
  messages: Message[];
  calendarEvent?: CalendarEvent | null;
}

/**
 * View-model used by job card/list UIs. Canonical data should come from Project.
 */

export interface JobRequest {
  id: string;
  orderNumber: string;
  organizationId: string;
  clientName: string;
  customerId?: string;
  projectManagerId?: string | null;
  editorId?: string | null;
  propertyAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  scheduledDate: string;
  scheduledTime: string;
  mediaType: ("photo" | "video" | "aerial" | "twilight")[];
  priority: "standard" | "rush" | "urgent";
  status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "editing"
    | "delivered"
    | "cancelled";
  assignedTechnicianId?: string; // Deprecated: use assignedTechnicianId
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

export interface TechnicianRanking {
  technician: Technician;
  score: number;
  factors: {
    availability: number;
    distance: number;
    distanceKm: number;
    reliability: number;
    skillMatch: number;
    preferredRelationship: number;
  };
  recommended: boolean;
}

// Backwards compatibility: TechnicianRanking is now TechnicianRanking
export interface TechnicianRanking {
  technician: Technician;
  score: number;
  factors: {
    availability: number;
    distance: number;
    distanceKm: number;
    reliability: number;
    skillMatch: number;
    preferredRelationship: number;
  };
  recommended: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  organizationId: string;
  action: string;
  resourceType: "job" | "technician" | "technician" | "organization" | "user";
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
}

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
    onTimeRate: number;
    clientSatisfaction: number;
  };
  revenue: {
    total: number;
    perJob: number;
  };
}

// Analytics
export interface AnalyticsSummary {
  period: "today" | "week" | "month";
  jobs: Metrics["jobs"];
  technicians: Metrics["technicians"];
  revenue: Metrics["revenue"];
  performance: Metrics["performance"];
}

// Marketplace
export interface MarketplaceJob {
  id: string;
  title: string;
  description: string;
  location?: string;
  compensation: number;
  currency: string;
  status: "open" | "assigned" | "closed";
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

export interface Transaction {
  id: string;
  jobId?: string;
  orgId: string;
  amount: number;
  currency: string;
  type: "payout" | "charge";
  status: "pending" | "completed" | "failed";
  createdAt: Date;
}
