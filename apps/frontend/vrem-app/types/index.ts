export interface Organization {
  id: string;
  name: string;
  type: 'media_company' | 'real_estate_team' | 'agent';
  createdAt: Date;
  avatar?: string;
  description?: string;
  services?: string[];
  photographerCount?: number;
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
  photographerId: string;
  photographerName: string;
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
  role: 'admin' | 'dispatcher' | 'photographer' | 'agent' | 'editor' | 'project_manager';
  organizationId: string;
  organizationType?: 'media_company' | 'real_estate_team' | 'agent';
}

export interface Photographer {
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
  assignedPhotographerId?: string;
  estimatedDuration: number; // minutes
  requirements: string;
  createdBy: string;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  propertyImage?: string;
}

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
  resourceType: 'job' | 'photographer' | 'organization' | 'user';
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
