export interface Organization {
  id: string;
  name: string;
  type: 'media_company' | 'real_estate_team' | 'agent';
  createdAt: Date;
  orgType?: 'COMPANY' | 'PERSONAL';
  avatar?: string;
  description?: string;
  services?: string[];
  technicianCount?: number;
  photographerCount?: number; // Deprecated: use technicianCount
  rating?: number;
  reviewCount?: number;
  coverageArea?: string[];
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
  photographerId: string; // Deprecated: use technicianId
  technicianId: string;
  photographerName: string; // Deprecated: use technicianName
  technicianName: string;
  companyId: string;
  companyName: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  appliedAt: Date;
  reviewedAt?: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'TECHNICIAN' | 'EDITOR' | 'AGENT';
  organizationId: string;
  organizationType?: 'media_company' | 'real_estate_team' | 'agent';
}

export interface Customer {
  id: string;
  orgId: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  organizationId: string;
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
  status: 'active' | 'inactive' | 'suspended';
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

// Backwards compatibility: Photographer is now Technician
export type Photographer = Technician;

export enum ProjectStatus {
  BOOKED = 'BOOKED',
  SHOOTING = 'SHOOTING',
  EDITING = 'EDITING',
  DELIVERED = 'DELIVERED',
}

export enum MediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  FLOORPLAN = 'FLOORPLAN',
  DOCUMENT = 'DOCUMENT',
}

export interface OrganizationMember {
  id: string;
  userId: string;
  orgId: string;
  role: User['role'];
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
  agentId?: string | null;
  customerId?: string | null;
  address: string;
  notes?: string;
  scheduledTime: Date;
  status: ProjectStatus;
  technicianId?: string;
  editorId?: string;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
  calendarEvent?: CalendarEvent | null;
  media?: Media[];
  messages?: Message[];
  agent?: User | null;
  editor?: User;
  technician?: User;
  organization?: Organization;
  customer?: Customer | null;
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
  propertyAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  scheduledDate: string;
  scheduledTime: string;
  mediaType: ('photo' | 'video' | 'aerial' | 'twilight')[];
  priority: 'standard' | 'rush' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'editing' | 'delivered' | 'cancelled';
  assignedPhotographerId?: string; // Deprecated: use assignedTechnicianId
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
  priority: 'standard' | 'rush' | 'urgent';
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

// Backwards compatibility: PhotographerRanking is now TechnicianRanking
export interface PhotographerRanking {
  photographer: Photographer;
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
  resourceType: 'job' | 'photographer' | 'technician' | 'organization' | 'user';
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface Metrics {
  organizationId: string;
  period: 'today' | 'week' | 'month';
  jobs: {
    total: number;
    pending: number;
    assigned: number;
    completed: number;
    cancelled: number;
  };
  photographers: {
    active: number;
    available: number;
    utilization: number;
  }; // Deprecated: use technicians
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
  period: 'today' | 'week' | 'month';
  jobs: Metrics['jobs'];
  technicians: Metrics['technicians'];
  revenue: Metrics['revenue'];
  performance: Metrics['performance'];
}

// Marketplace
export interface MarketplaceJob {
  id: string;
  title: string;
  description: string;
  location?: string;
  compensation: number;
  currency: string;
  status: 'open' | 'assigned' | 'closed';
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Transaction {
  id: string;
  jobId?: string;
  orgId: string;
  amount: number;
  currency: string;
  type: 'payout' | 'charge';
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}
