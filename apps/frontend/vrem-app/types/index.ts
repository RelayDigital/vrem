export interface Organization {
  id: string;
  name: string;
  type: 'media_company' | 'real_estate_team' | 'agent';
  createdAt: Date;
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

export interface JobRequest {
  id: string;
  orderNumber: string;
  organizationId: string;
  clientName: string;
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
