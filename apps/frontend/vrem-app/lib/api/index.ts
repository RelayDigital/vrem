import { User, Metrics, JobRequest, Technician, AuditLogEntry, Project, ProjectStatus, Media, OrganizationMember, Organization, AnalyticsSummary, MarketplaceJob, JobApplication, Transaction, Customer } from '@/types';
import {
  currentUser,
  jobRequests,
  technicians,
  auditLog,
  metrics,
  organizations,
} from '@/lib/mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || '';
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private normalizeProject(project: any): Project {
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      scheduledTime: new Date(project.scheduledTime),
      calendarEvent: project.calendarEvent
        ? { ...project.calendarEvent, createdAt: new Date(project.calendarEvent.createdAt) }
        : project.calendarEvent,
      media: project.media?.map((media: any) => ({
        ...media,
        createdAt: new Date(media.createdAt),
      })),
      messages: project.messages?.map((message: any) => ({
        ...message,
        timestamp: new Date(message.timestamp || message.createdAt),
      })),
    };
  }

  // Used only for mock data to turn legacy job cards into canonical projects
  private mapJobCardToProject(job: JobRequest): Project {
    const scheduledTime = job.scheduledDate && job.scheduledTime
      ? new Date(`${job.scheduledDate}T${job.scheduledTime}`)
      : new Date();

    // Store location in notes as metadata if location is provided
    let notes = job.requirements || '';
    if (job.location && job.location.lat !== 51.0447 && job.location.lng !== -114.0719) {
      // Only store if it's not the default location
      const locationMetadata = `__LOCATION__:${JSON.stringify(job.location)}__`;
      notes = notes ? `${locationMetadata} ${notes}` : locationMetadata;
    }

    return {
      id: job.id,
      agentId: job.createdBy,
      address: job.propertyAddress,
      notes: notes,
      scheduledTime,
      status: this.jobStatusToProjectStatus(job.status),
      technicianId: job.assignedTechnicianId,
      editorId: undefined,
      createdAt: job.createdAt ? new Date(job.createdAt) : new Date(),
      updatedAt: job.assignedAt ? new Date(job.assignedAt) : new Date(job.createdAt || new Date()),
      orgId: job.organizationId,
      media: [],
      messages: [],
    };
  }

  private jobStatusToProjectStatus(status: JobRequest['status']): ProjectStatus {
    switch (status) {
      case 'in_progress':
        return ProjectStatus.SHOOTING;
      case 'editing':
        return ProjectStatus.EDITING;
      case 'delivered':
        return ProjectStatus.DELIVERED;
      case 'assigned':
      case 'pending':
      default:
        return ProjectStatus.BOOKED;
    }
  }

  private projectStatusToJobStatus(status: ProjectStatus, technicianId?: string): JobRequest['status'] {
    switch (status) {
      case ProjectStatus.BOOKED:
        return technicianId ? 'assigned' : 'pending';
      case ProjectStatus.SHOOTING:
        return 'in_progress';
      case ProjectStatus.EDITING:
        return 'editing';
      case ProjectStatus.DELIVERED:
        return 'delivered';
      default:
        return 'pending';
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') : null;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    if (orgId) {
      (headers as Record<string, string>)['x-org-id'] = orgId;
    }

    const fullUrl = `${this.baseUrl}${API_PREFIX}${endpoint}`;
    const method = options.method || 'GET';
    const hasAuth = !!token;
    const hasOrgId = !!orgId;

    // Log request details before fetch
    console.log('[API Request]', {
      endpoint,
      fullUrl,
      method,
      hasAuthorization: hasAuth,
      hasOrgId: hasOrgId,
      orgId: orgId || 'none',
    });

    let response: Response;
    try {
      response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    } catch (error: any) {
      // Network error (fetch failed completely)
      const errorMessage = error.message || 'Network request failed';
      console.error('[API Network Error]', {
        endpoint,
        fullUrl,
        method,
        error: errorMessage,
      });

      // Track persistent network errors
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backend-api-error', {
          detail: { message: `${method} ${endpoint} failed: ${errorMessage}` }
        }));
      }

      throw new Error(`Network Error: ${errorMessage}`);
    }

    if (!response.ok) {
      // Try to parse response body as JSON, fallback to text
      let responseBody: any;
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }
      } catch (e) {
        responseBody = `Failed to parse response body: ${e}`;
      }

      // Log error details
      console.error('[API Error]', {
        endpoint,
        fullUrl,
        method,
        status: response.status,
        statusText: response.statusText,
        responseBody,
        hasAuthorization: hasAuth,
        hasOrgId: hasOrgId,
        orgId: orgId || 'none',
      });

      // Track persistent API errors (non-401 errors that indicate backend issues)
      if (response.status !== 401 && typeof window !== 'undefined') {
        const errorMessage = typeof responseBody === 'object' && responseBody?.message
          ? responseBody.message
          : typeof responseBody === 'string' && responseBody
          ? responseBody
          : response.statusText;
        
        const issueMessage = `${method} ${endpoint} failed: ${response.status} ${errorMessage}`;
        
        // Dispatch event for backend health monitoring
        window.dispatchEvent(new CustomEvent('backend-api-error', {
          detail: { message: issueMessage }
        }));
      }

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('organizationId');
          // Optional: Redirect to login or dispatch event
          // window.location.href = '/login'; 
        }
      }

      // Create error with status code and backend message
      const errorMessage = typeof responseBody === 'object' && responseBody?.message
        ? responseBody.message
        : typeof responseBody === 'string' && responseBody
        ? responseBody
        : response.statusText;
      
      const error = new Error(`API Error [${response.status}]: ${errorMessage}`);
      (error as any).status = response.status;
      (error as any).responseBody = responseBody;
      throw error;
    }

    // Track successful API calls
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backend-api-success'));
    }

    return response.json();
  }

  auth = {
    login: async (credentials: { email: string; password: string }) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const mockUser = this.mockUserFromEmail(credentials.email);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
        }
        return {
          token: 'mock-token',
          user: mockUser,
        };
      }
      return this.request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    register: async (data: any) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          token: 'mock-token',
          user: { ...currentUser, ...data }
        };
      }
      // Always inject AGENT role for public signup
      const payload = {
        ...data,
        role: 'AGENT',
      };
      return this.request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    me: async () => {
      if (USE_MOCK_DATA) {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('mockUser');
          if (stored) return JSON.parse(stored);
        }
        return currentUser;
      }
      return this.request<User>('/auth/me');
    },
  };

  organizations = {
    listMine: async (): Promise<OrganizationMember[]> => {
      if (USE_MOCK_DATA) {
        return organizations.map((org) => ({
          id: `${org.id}-member`,
          userId: currentUser.id,
          orgId: org.id,
          role: currentUser.role,
          createdAt: org.createdAt,
          organization: org,
        }));
      }
      try {
        const memberships = await this.request<any[]>('/organizations');
        return memberships.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }));
      } catch (err) {
        // Backend may not expose organizations; fall back to empty
        return [];
      }
    },
    getById: async (orgId: string): Promise<Organization> => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const org = organizations.find(o => o.id === orgId);
        if (!org) throw new Error('Organization not found');
        return org;
      }
      const org = await this.request<Organization>(`/organizations/${orgId}`);
      return {
        ...org,
        createdAt: new Date(org.createdAt),
      };
    },
    listMembers: async (): Promise<OrganizationMember[]> => {
      if (USE_MOCK_DATA) {
        return [];
      }
      const orgId = this.organizations.getActiveOrganization();
      if (!orgId) return [];
      const members = await this.request<any[]>(`/organizations/${orgId}/members`);
      return members.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt),
        personalOrg: m.personalOrg
          ? {
              ...m.personalOrg,
              createdAt: m.personalOrg.createdAt ? new Date(m.personalOrg.createdAt) : undefined,
            }
          : null,
      }));
    },
    updateSettings: async (orgId: string, payload: Partial<Organization>): Promise<Organization> => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const org = organizations.find(o => o.id === orgId);
        if (!org) throw new Error('Organization not found');
        return { ...org, ...payload };
      }
      const org = await this.request<Organization>(`/organizations/${orgId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return {
        ...org,
        createdAt: new Date(org.createdAt),
      };
    },
    setActiveOrganization: (orgId: string | null) => {
      if (typeof window === 'undefined') return;
      if (orgId) {
        localStorage.setItem('organizationId', orgId);
      } else {
        localStorage.removeItem('organizationId');
      }
    },
    getActiveOrganization: (): string | null => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('organizationId');
    },
  };

  customers = {
    list: async (search?: string): Promise<Customer[]> => {
      if (USE_MOCK_DATA) {
        return [];
      }
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const customers = await this.request<Customer[]>(`/customers${query}`);
      return customers.map((c) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        lastJob: c.lastJob ? new Date(c.lastJob as any) : null,
      }));
    },
    create: async (payload: Partial<Customer>): Promise<Customer> => {
      if (USE_MOCK_DATA) {
        const now = new Date();
        return {
          id: `cust-${Date.now()}`,
          orgId: payload.orgId || 'org-mock',
          name: payload.name || 'New Customer',
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
          agentId: payload.agentId,
          createdAt: now,
          updatedAt: now,
        };
      }
      const customer = await this.request<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
          agentId: payload.agentId,
        }),
      });
      return {
        ...customer,
        createdAt: new Date(customer.createdAt),
        updatedAt: new Date(customer.updatedAt),
      };
    },
  };

  projects = {
    // Canonical list scoped to current user/org
    listForCurrentUser: async (): Promise<Project[]> => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return jobRequests.map(job => this.mapJobCardToProject(job));
      }
      const projects = await this.request<Project[]>('/projects/mine');
      return projects.map((project) => this.normalizeProject(project));
    },
    // Org-wide listing (PM/Admin)
    listForOrg: async (): Promise<Project[]> => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return jobRequests.map(job => this.mapJobCardToProject(job));
      }
      const projects = await this.request<Project[]>('/projects');
      return projects.map((project) => this.normalizeProject(project));
    },
    getById: async (id: string): Promise<Project> => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const job = jobRequests.find(j => j.id === id);
        if (!job) throw new Error('Project not found');
        return this.mapJobCardToProject(job);
      }
      const project = await this.request<Project>(`/projects/${id}`);
      return this.normalizeProject(project);
    },
    create: async (payload: Partial<Project>): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = this.mapJobCardToProject(this.mapProjectToJobCard({
          ...payload,
          id: `proj-${Date.now()}`,
          createdAt: payload.createdAt || new Date(),
          updatedAt: payload.updatedAt || new Date(),
          scheduledTime: payload.scheduledTime || new Date(),
          agentId: payload.agentId || currentUser.id,
          orgId: payload.orgId || currentUser.organizationId,
          status: payload.status || ProjectStatus.BOOKED,
        } as Project));
        return project;
      }
      // Ensure org header is set for OrgMemberGuard
      if (payload.orgId) {
        this.organizations.setActiveOrganization(payload.orgId);
      }
      const dto = {
        agentId: payload.agentId,
        address: payload.address,
        notes: payload.notes,
        scheduledTime: payload.scheduledTime?.toISOString() || new Date().toISOString(),
      };
      const project = await this.request<Project>('/projects/create', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      return this.normalizeProject(project);
    },
    update: async (id: string, payload: Partial<Project>): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const existing = jobRequests.find(j => j.id === id);
        if (!existing) throw new Error('Project not found');
        const existingProject = this.mapJobCardToProject(existing);
        const updated = { ...existingProject, ...payload };
        return updated;
      }
      const dto = {
        address: payload.address,
        notes: payload.notes,
        scheduledTime: payload.scheduledTime?.toISOString(),
      };
      const project = await this.request<Project>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
      return this.normalizeProject(project);
    },
    updateStatus: async (id: string, status: ProjectStatus): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, status, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return this.normalizeProject(project);
    },
    assignTechnician: async (id: string, technicianId: string): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, technicianId, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/assign-technician`, {
        method: 'PATCH',
        body: JSON.stringify({ technicianId }),
      });
      return this.normalizeProject(project);
    },
    assignEditor: async (id: string, editorId: string): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, editorId, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/assign-editor`, {
        method: 'PATCH',
        body: JSON.stringify({ editorId }),
      });
      return this.normalizeProject(project);
    },
    assignAgent: async (id: string, agentId: string): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, agentId, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/assign-agent`, {
        method: 'PATCH',
        body: JSON.stringify({ agentId }),
      });
      return this.normalizeProject(project);
    },
    schedule: async (id: string, scheduledTime: Date): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, scheduledTime, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledTime: scheduledTime.toISOString() }),
      });
      return this.normalizeProject(project);
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK_DATA) {
        return;
      }
      await this.request(`/projects/${id}`, { method: 'DELETE' });
    },
    getMessages: async (projectId: string) => {
      if (USE_MOCK_DATA) {
        return [];
      }
      const messages = await this.request<any[]>(`/projects/${projectId}/messages`);
      return messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp || msg.createdAt),
      }));
    },
    addMessage: async (projectId: string, content: string) => {
      if (USE_MOCK_DATA) {
        return {
          id: Math.random().toString(),
          content,
          projectId,
          timestamp: new Date(),
        };
      }
      const msg = await this.request<any>(`/projects/${projectId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return { ...msg, timestamp: new Date(msg.timestamp || msg.createdAt) };
    },
  };

  // Tasks API placeholder (backend task endpoints not implemented yet)
  tasks = {
    updateStatus: async (_taskId: string, _status: string, _payload?: Record<string, any>) => {
      throw new Error('Task endpoints are not implemented on the backend.');
    },
    assign: async (_taskId: string, _userId: string) => {
      throw new Error('Task endpoints are not implemented on the backend.');
    },
  };

  availability = {
    // Backend availability endpoints not implemented yet (Cronofy todo)
    check: async (_params: Record<string, any>) => {
      throw new Error('Availability endpoints are not implemented on the backend.');
    },
  };

  payments = {
    // Payment/Stripe endpoints not implemented yet
    initiateProjectPayment: async (_projectId: string, _payload?: Record<string, any>) => {
      throw new Error('Payment endpoints are not implemented on the backend.');
    },
  };

  media = {
    getForProject: async (projectId: string): Promise<Media[]> => {
      if (USE_MOCK_DATA) {
        return [];
      }
      return this.request<Media[]>(`/media/project/${projectId}`);
    },
    confirmUpload: async (payload: { key: string; projectId: string; filename: string; size: number; type: string; cdnUrl?: string; }) => {
      return this.request(`/media/confirm-upload`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: string) => {
      if (USE_MOCK_DATA) return;
      return this.request(`/media/${id}`, { method: 'DELETE' });
    },
  };

  // Legacy shim to avoid breaking older call sites; prefer projects.listForCurrentUser/getById.
  jobs = {
    getAll: () => this.projects.listForCurrentUser(),
    getById: (id: string) => this.projects.getById(id),
  };

  calendar = {
    getEvents: async () => {
      const projects = await this.projects.listForCurrentUser();
      return projects.map(project => {
        const job = this.mapProjectToJobCard(project);
        return {
          id: job.id,
          title: `${job.clientName} - ${job.propertyAddress}`,
          start: new Date(`${job.scheduledDate}T${job.scheduledTime}`),
          end: new Date(new Date(`${job.scheduledDate}T${job.scheduledTime}`).getTime() + job.estimatedDuration * 60000),
          resourceId: job.assignedTechnicianId,
        };
      });
    },
  };

  // Dashboard endpoint - fetches dashboard data from backend
  dashboard = {
    get: async () => {
      if (USE_MOCK_DATA) {
        const projects = await this.projects.listForCurrentUser();
        return {
          projects,
          jobCards: projects.map((p) => this.mapProjectToJobCard(p)),
          photographers: technicians,
          auditLog: auditLog,
          metrics: metrics,
        };
      }
      try {
        const dashboardData = await this.request<any>('/dashboard');
        const projects = dashboardData.projects || [];
        return {
          projects: projects.map((p: any) => this.normalizeProject(p)),
          jobCards: projects.map((p: any) => this.mapProjectToJobCard(this.normalizeProject(p))),
          photographers: dashboardData.photographers || [],
          auditLog: dashboardData.auditLog || [],
          metrics: dashboardData.metrics || {
            organizationId: "",
            period: "week" as const,
            jobs: { total: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 },
            photographers: { active: 0, available: 0, utilization: 0 },
            technicians: { active: 0, available: 0, utilization: 0 },
            performance: { averageAssignmentTime: 0, averageDeliveryTime: 0, onTimeRate: 0, clientSatisfaction: 0 },
            revenue: { total: 0, perJob: 0 },
          },
        };
      } catch (error) {
        // Fallback to projects-only if dashboard endpoint fails
        const projects = await this.projects.listForCurrentUser();
        return {
          projects,
          jobCards: projects.map((p) => this.mapProjectToJobCard(p)),
          photographers: [],
          auditLog: [],
          metrics: {
            organizationId: "",
            period: "week" as const,
            jobs: { total: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 },
            photographers: { active: 0, available: 0, utilization: 0 },
            technicians: { active: 0, available: 0, utilization: 0 },
            performance: { averageAssignmentTime: 0, averageDeliveryTime: 0, onTimeRate: 0, clientSatisfaction: 0 },
            revenue: { total: 0, perJob: 0 },
          },
        };
      }
    },
  };

  chat = {
    getMessages: async (jobId: string) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return []; // Return empty array for mock chat
      }
      // Use ProjectsController endpoint
      const messages = await this.request<any[]>(`/projects/${jobId}/messages`);
      
      // Map backend message format to frontend ChatMessage
      return messages.map(msg => ({
        id: msg.id,
        jobId: msg.projectId,
        userId: msg.userId,
        userName: msg.user?.name || 'Unknown User',
        userAvatar: msg.user?.avatar,
        content: msg.content,
        createdAt: msg.timestamp || msg.createdAt, // Handle both potential field names
        chatType: 'team', // Default to team chat as backend doesn't seem to distinguish yet
      }));
    },
    sendMessage: async (jobId: string, content: string) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          id: Math.random().toString(),
          content,
          senderId: currentUser.id,
          createdAt: new Date(),
        };
      }
      // Use ProjectsController endpoint
      const msg = await this.request<any>(`/projects/${jobId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      
      return {
        id: msg.id,
        jobId: msg.projectId,
        userId: msg.userId,
        userName: msg.user?.name || 'Unknown User',
        userAvatar: msg.user?.avatar,
        content: msg.content,
        createdAt: msg.timestamp || msg.createdAt,
        chatType: 'team',
      };
    },
  };

  // Helper to extract location from notes if stored as metadata
  private extractLocationFromNotes(notes?: string): { lat: number; lng: number } | null {
    if (!notes) return null;
    try {
      // Look for location metadata in notes (format: "__LOCATION__:{"lat":51.0,"lng":-114.0}__")
      const locationMatch = notes.match(/__LOCATION__:({[^}]+})__/);
      if (locationMatch) {
        const location = JSON.parse(locationMatch[1]);
        if (location.lat && location.lng) {
          return { lat: location.lat, lng: location.lng };
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }

  // Helper to extract requirements from notes (removing location metadata)
  private extractRequirementsFromNotes(notes?: string): string {
    if (!notes) return '';
    // Remove location metadata if present
    return notes.replace(/__LOCATION__:{[^}]+}__\s*/, '').trim();
  }

  // Helper to map backend Project to frontend JobRequest (View Model)
  public mapProjectToJobCard(project: Project): JobRequest {
    const scheduledDate = project.scheduledTime ? new Date(project.scheduledTime) : new Date();
    
    // Try to extract location from notes metadata, fallback to default
    const location = this.extractLocationFromNotes(project.notes) || { lat: 51.0447, lng: -114.0719 };
    const requirements = this.extractRequirementsFromNotes(project.notes);
    
    return {
      id: project.id,
      orderNumber: project.id.substring(0, 8), // Use part of ID as order number
      organizationId: project.orgId,
      clientName: project.customer?.name || project.agent?.name || 'Unassigned',
      customerId: project.customerId || undefined,
      propertyAddress: project.address || '',
      location: location,
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      scheduledTime: scheduledDate.toTimeString().substring(0, 5),
      mediaType: ['photo'], // Default as backend media relation might be complex
      priority: 'standard',
      status: this.projectStatusToJobStatus(project.status, project.technicianId),
      assignedTechnicianId: project.technicianId,
      estimatedDuration: 120, // Default duration
      requirements: requirements,
      createdBy: project.agentId || 'system',
      createdAt: new Date(project.createdAt),
      assignedAt: project.technicianId ? new Date(project.updatedAt) : undefined,
      propertyImage: 'https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?w=800', // Default image
    };
  }

  analytics = {
    getSummary: async (period: AnalyticsSummary['period'] = 'week'): Promise<AnalyticsSummary> => {
      if (USE_MOCK_DATA) {
        return {
          period,
          jobs: { total: 25, pending: 5, assigned: 8, completed: 10, cancelled: 2 },
          technicians: { active: 12, available: 8, utilization: 0.65 },
          revenue: { total: 25000, perJob: 1000 },
          performance: { averageAssignmentTime: 30, averageDeliveryTime: 48, onTimeRate: 0.9, clientSatisfaction: 4.7 },
        };
      }
      throw new Error('Analytics endpoints are not implemented on the backend.');
    },
  };

  marketplace = {
    listJobs: async (): Promise<MarketplaceJob[]> => {
      if (USE_MOCK_DATA) {
        const now = new Date();
        return [
          { id: 'mkt-1', title: 'Listing Photo Shoot', description: '3-bed residential shoot', compensation: 300, currency: 'USD', status: 'open', orgId: 'org-1', createdAt: now, updatedAt: now },
        ];
      }
      throw new Error('Marketplace endpoints are not implemented on the backend.');
    },
    getJob: async (_id: string): Promise<MarketplaceJob> => {
      if (USE_MOCK_DATA) {
        const now = new Date();
        return { id: _id, title: 'Listing Photo Shoot', description: '3-bed residential shoot', compensation: 300, currency: 'USD', status: 'open', orgId: 'org-1', createdAt: now, updatedAt: now };
      }
      throw new Error('Marketplace endpoints are not implemented on the backend.');
    },
    apply: async (_jobId: string, _payload?: Partial<JobApplication>): Promise<JobApplication> => {
      if (USE_MOCK_DATA) {
        return { id: 'app-1', jobId: _jobId, applicantId: currentUser.id, coverLetter: _payload?.coverLetter, status: 'pending', createdAt: new Date() };
      }
      throw new Error('Marketplace endpoints are not implemented on the backend.');
    },
    listTransactions: async (): Promise<Transaction[]> => {
      if (USE_MOCK_DATA) {
        return [
          { id: 'txn-1', jobId: 'mkt-1', orgId: 'org-1', amount: 250, currency: 'USD', type: 'payout', status: 'completed', createdAt: new Date() },
        ];
      }
      throw new Error('Marketplace endpoints are not implemented on the backend.');
    },
  };

  private mockUserFromEmail(email: string): User {
    const lower = email.toLowerCase();
    const roleMap: Record<string, User['role']> = {
      admin: 'ADMIN',
      pm: 'PROJECT_MANAGER',
      dispatcher: 'PROJECT_MANAGER',
      tech: 'TECHNICIAN',
      photographer: 'TECHNICIAN',
      editor: 'EDITOR',
      agent: 'AGENT',
    };
    const matchedKey = Object.keys(roleMap).find((key) => lower.includes(key));
    const role = matchedKey ? roleMap[matchedKey] : currentUser.role;
    return {
      ...currentUser,
      email,
      role,
      name: `${role} User`,
    };
  }
}

export const api = new ApiClient(API_URL);
