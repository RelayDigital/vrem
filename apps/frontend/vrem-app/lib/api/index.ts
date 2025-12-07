import { User, Metrics, JobRequest, Technician, AuditLogEntry, Project, ProjectStatus, Media, OrganizationMember, Organization, AnalyticsSummary, MarketplaceJob, JobApplication, Transaction, Customer, NotificationItem, OrganizationPublicInfo, CustomerCreateResponse } from '@/types';
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
    const legacyAddress = project.address || {};
    const address = {
      ...legacyAddress,
      street_name:
        legacyAddress.street_name ??
        project.addressLine1 ??
        legacyAddress.unparsed_address,
      unit_number: legacyAddress.unit_number ?? project.addressLine2,
      postal_code: legacyAddress.postal_code ?? project.postalCode,
      city: legacyAddress.city ?? project.city,
      state_or_province: legacyAddress.state_or_province ?? project.region,
      country: legacyAddress.country ?? project.countryCode,
      latitude: legacyAddress.latitude ?? project.lat,
      longitude: legacyAddress.longitude ?? project.lng,
      unparsed_address:
        legacyAddress.unparsed_address ||
        [
          project.addressLine1,
          project.addressLine2,
          project.city,
          project.region,
          project.postalCode,
          project.countryCode,
        ]
          .filter(Boolean)
          .join(', '),
    };

    return {
      ...project,
      address,
      lat: address.latitude ?? undefined,
      lng: address.longitude ?? undefined,
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
    // Legacy note embedding not needed when address has coords; kept for compatibility

    const address = {
      unparsed_address: job.propertyAddress,
      latitude: job.location?.lat,
      longitude: job.location?.lng,
    };

    return {
      id: job.id,
      projectManagerId: job.createdBy,
      address,
      addressLine1: job.propertyAddress,
      city: undefined,
      region: undefined,
      postalCode: undefined,
      countryCode: undefined,
      lat: job.location?.lat,
      lng: job.location?.lng,
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

  private withLocationNotes(
    notes: string | undefined,
    location?: { lat: number; lng: number }
  ): string | undefined {
    const locationNote = location
      ? `__LOCATION__:${JSON.stringify(location)}__`
      : '';
    const parts = [locationNote, notes].filter(Boolean);
    const combined = parts.join(' ').trim();
    return combined || undefined;
  }

  private buildAddressFields(payload: any): any {
    const address = typeof payload?.address === 'object' ? payload.address : {};
    const location = payload?.location;

    const addressLine1 =
      payload?.addressLine1 ||
      (typeof payload?.propertyAddress === 'string'
        ? payload.propertyAddress
        : undefined) ||
      (typeof payload?.address === 'string' ? payload.address : undefined) ||
      address.street_name;

    return {
      addressLine1:
        typeof addressLine1 === 'string' ? addressLine1 : undefined,
      addressLine2: payload?.addressLine2 || address.unit_number,
      city: payload?.city || address.city,
      region: payload?.region || address.state_or_province,
      postalCode: payload?.postalCode || address.postal_code,
      countryCode: payload?.countryCode || address.country,
      lat:
        payload?.lat ??
        address.latitude ??
        location?.lat ??
        (typeof address.latitude === 'number' ? address.latitude : undefined),
      lng:
        payload?.lng ??
        address.longitude ??
        location?.lng ??
        (typeof address.longitude === 'number' ? address.longitude : undefined),
    };
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
      // Always inject AGENT accountType for public signup
      const payload = {
        ...data,
        accountType: 'AGENT',
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

  users = {
    update: async (id: string, payload: Partial<Pick<User, 'name' | 'avatarUrl'>>) => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { ...currentUser, id, ...payload };
      }
      const user = await this.request<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return user;
    },
  };

  organizations = {
    listMine: async (): Promise<OrganizationMember[]> => {
      if (USE_MOCK_DATA) {
        return organizations.map<OrganizationMember>((org) => ({
          id: `${org.id}-member`,
          userId: currentUser.id,
          orgId: org.id,
          role: 'ADMIN' as OrganizationMember['orgRole'],
          orgRole: 'ADMIN' as OrganizationMember['orgRole'],
          createdAt: org.createdAt,
          organization: org,
          user: currentUser as any,
        }));
      }
      try {
        const memberships = await this.request<any[]>('/organizations');
        return memberships.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          organization: {
            ...m.organization,
            createdAt: m.organization?.createdAt
              ? new Date(m.organization.createdAt)
              : undefined,
          },
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
    createInvite: async (
      email: string,
      role: OrganizationMember['role'] = 'TECHNICIAN'
    ) => {
      if (USE_MOCK_DATA) {
        return {
          id: `invite-${Date.now()}`,
          orgId: this.organizations.getActiveOrganization() || 'org-mock',
          email,
          role,
          token: 'mock-token',
          accepted: false,
          createdAt: new Date(),
        };
      }
      const orgId = this.organizations.getActiveOrganization();
      if (!orgId) {
        throw new Error('No active organization selected');
      }
      const invite = await this.request<any>(`/organizations/${orgId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      return {
        ...invite,
        createdAt: invite?.createdAt ? new Date(invite.createdAt) : new Date(),
      };
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
        headers: {
          'x-org-id': orgId,
        },
        body: JSON.stringify(payload),
      });
      return {
        ...org,
        createdAt: new Date(org.createdAt),
      };
    },
    updateMemberRole: async (
      memberId: string,
      role: OrganizationMember['role']
    ): Promise<OrganizationMember> => {
      if (USE_MOCK_DATA) {
        return {
          id: memberId,
          userId: '',
          orgId: '',
          role,
          orgRole: (role || 'ADMIN') as OrganizationMember['orgRole'],
          createdAt: new Date(),
          organization: organizations[0],
          user: currentUser as any,
        };
      }
      const orgId = this.organizations.getActiveOrganization();
      if (!orgId) {
        throw new Error('No active organization selected');
      }
      const member = await this.request<OrganizationMember>(
        `/organizations/${orgId}/members/${memberId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        }
      );
      return {
        ...member,
        createdAt: new Date(member.createdAt),
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
      }));
    },
    create: async (payload: Partial<Customer>): Promise<CustomerCreateResponse> => {
      if (USE_MOCK_DATA) {
        const now = new Date();
        return {
          type: 'customer_created',
          customer: {
            id: `cust-${Date.now()}`,
            orgId: payload.orgId || 'org-mock',
            name: payload.name || 'New Customer',
            email: payload.email,
            phone: payload.phone,
            notes: payload.notes,
            userId: payload.userId,
            createdAt: now,
            updatedAt: now,
          },
        };
      }
      const response = await this.request<CustomerCreateResponse>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
          userId: payload.userId,
        }),
      });
      
      // Normalize dates if customer is present
      if (response.customer) {
        response.customer = {
          ...response.customer,
          createdAt: new Date(response.customer.createdAt),
          updatedAt: new Date(response.customer.updatedAt),
        };
      }
      
      return response;
    },
    update: async (id: string, payload: Partial<Customer>): Promise<Customer> => {
      if (USE_MOCK_DATA) {
        const now = new Date();
        return {
          id,
          orgId: payload.orgId || 'org-mock',
          name: payload.name || 'Updated Customer',
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
          userId: payload.userId,
          createdAt: now,
          updatedAt: now,
        };
      }
      const customer = await this.request<Customer>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
        }),
      });
      return {
        ...customer,
        createdAt: new Date(customer.createdAt),
        updatedAt: new Date(customer.updatedAt),
      };
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK_DATA) return;
      await this.request(`/customers/${id}`, { method: 'DELETE' });
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
        ...this.buildAddressFields(payload),
        notes: payload.notes,
        scheduledTime: payload.scheduledTime?.toISOString() || new Date().toISOString(),
        customerId: payload.customerId,
        projectManagerId: payload.projectManagerId,
        technicianId: payload.technicianId,
        editorId: payload.editorId,
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
        ...this.buildAddressFields(payload),
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
    assignCustomer: async (id: string, customerId: string | null): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, customerId: customerId || undefined, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/assign-customer`, {
        method: 'PATCH',
        body: JSON.stringify({ customerId: customerId || null }),
      });
      return this.normalizeProject(project);
    },
    assignProjectManager: async (id: string, projectManagerId: string | null): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, projectManagerId: projectManagerId || undefined, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/assign-project-manager`, {
        method: 'PATCH',
        body: JSON.stringify({ projectManagerId: projectManagerId || null }),
      });
      return this.normalizeProject(project);
    },
    assignEditor: async (id: string, editorId: string | null): Promise<Project> => {
      if (USE_MOCK_DATA) {
        const project = await this.projects.getById(id);
        return { ...project, editorId: editorId || undefined, updatedAt: new Date() };
      }
      const project = await this.request<Project>(`/projects/${id}/assign-editor`, {
        method: 'PATCH',
        body: JSON.stringify({ editorId: editorId || null }),
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

  payments = {
    // Payment/Stripe endpoints not implemented yet
    initiateProjectPayment: async (_projectId: string, _payload?: Record<string, any>) => {
      throw new Error('Payment endpoints are not implemented on the backend.');
    },
  };

  media = {
    listForProject: async (projectId: string): Promise<Media[]> => {
      if (USE_MOCK_DATA) {
        return [];
      }
      const media = await this.request<Media[]>(`/projects/${projectId}/media`);
      return media.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }));
    },
    addToProject: async (
      projectId: string,
      payload: {
        key: string;
        cdnUrl?: string;
        filename: string;
        size: number;
        type: string;
      }
    ): Promise<Media> => {
      if (USE_MOCK_DATA) {
        return {
          id: `media-${Date.now()}`,
          projectId,
          key: payload.key,
          cdnUrl: payload.cdnUrl,
          filename: payload.filename,
          size: payload.size,
          type: payload.type as any,
          createdAt: new Date(),
        };
      }
      const media = await this.request<Media>(`/projects/${projectId}/media`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return { ...media, createdAt: new Date(media.createdAt) };
    },
    deleteFromProject: async (projectId: string, mediaId: string) => {
      if (USE_MOCK_DATA) return;
      return this.request(`/projects/${projectId}/media/${mediaId}`, { method: 'DELETE' });
    },
    // Legacy aliases to avoid breaking older call sites
    getForProject: async (projectId: string) => this.media.listForProject(projectId),
    confirmUpload: async (payload: { key: string; projectId: string; filename: string; size: number; type: string; cdnUrl?: string; }) =>
      this.media.addToProject(payload.projectId, {
        key: payload.key,
        cdnUrl: payload.cdnUrl,
        filename: payload.filename,
        size: payload.size,
        type: payload.type,
      }),
    delete: async (id: string, projectId?: string) => {
      if (USE_MOCK_DATA) return;
      if (projectId) {
        return this.media.deleteFromProject(projectId, id);
      }
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
          technicians: technicians,
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
          technicians: dashboardData.technicians || [],
          auditLog: dashboardData.auditLog || [],
          metrics: dashboardData.metrics || {
            organizationId: "",
            period: "week" as const,
            jobs: { total: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 },
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
          technicians: [],
          auditLog: [],
          metrics: {
            organizationId: "",
            period: "week" as const,
            jobs: { total: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 },
            technicians: { active: 0, available: 0, utilization: 0 },
            performance: { averageAssignmentTime: 0, averageDeliveryTime: 0, onTimeRate: 0, clientSatisfaction: 0 },
            revenue: { total: 0, perJob: 0 },
          },
        };
      }
    },
  };

  chat = {
    getMessages: async (jobId: string, channel: 'TEAM' | 'CUSTOMER' = 'TEAM') => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return []; // Return empty array for mock chat
      }
      // Use ProjectsController endpoint
      const messages = await this.request<any[]>(
        `/projects/${jobId}/messages?channel=${channel}`,
      );
      
      // Map backend message format to frontend ChatMessage
      return messages.map(msg => ({
        id: msg.id,
        jobId: msg.projectId,
        userId: msg.userId,
        userName: msg.user?.name || 'Unknown User',
        userAvatar: msg.user?.avatar,
        content: msg.content,
        createdAt: msg.timestamp || msg.createdAt, // Handle both potential field names
        channel: msg.channel || 'TEAM',
        thread: msg.thread ?? msg.threadId ?? null,
        threadId: msg.thread ?? msg.threadId ?? null,
        chatType: (msg.channel || 'TEAM') === 'CUSTOMER' ? 'client' : 'team',
      }));
    },
    sendMessage: async (
      jobId: string,
      content: string,
      channel: 'TEAM' | 'CUSTOMER' = 'TEAM',
      thread?: string | null,
    ) => {
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
        body: JSON.stringify({ content, channel, thread }),
      });
      
      return {
        id: msg.id,
        jobId: msg.projectId,
        userId: msg.userId,
        userName: msg.user?.name || 'Unknown User',
        userAvatar: msg.user?.avatar,
        content: msg.content,
        createdAt: msg.timestamp || msg.createdAt,
        channel: msg.channel || channel,
        thread: msg.thread ?? thread ?? null,
        threadId: msg.thread ?? thread ?? null,
        chatType: (msg.channel || channel) === 'CUSTOMER' ? 'client' : 'team',
      };
    },
  };

  messages = {
    delete: async (id: string) => {
      if (USE_MOCK_DATA) {
        return { success: true };
      }
      return this.request(`/messages/${id}`, { method: 'DELETE' });
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

  private buildAddressString(address: any): string {
    if (!address) return '';
    const parts = [
      address.street_number,
      address.street_name,
      address.unit_number,
      address.city,
      address.state_or_province,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    if (parts.length) return parts.join(', ');
    return address.unparsed_address || '';
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
    const addressObj: any = (project as any).address || {};
    // Fallback to flat fields if address is missing coords
    if (!addressObj.latitude && project.lat !== undefined) {
      addressObj.latitude = project.lat;
    }
    if (!addressObj.longitude && project.lng !== undefined) {
      addressObj.longitude = project.lng;
    }

    // Prefer address latitude/longitude, fallback to notes metadata or default
    const location =
      (addressObj.latitude !== undefined && addressObj.longitude !== undefined
        ? { lat: addressObj.latitude, lng: addressObj.longitude }
        : null) ||
      (project as any)?.location ||
      this.extractLocationFromNotes(project.notes) ||
      { lat: 51.0447, lng: -114.0719 };

    const propertyAddress = this.buildAddressString(addressObj) || '';
    const requirements = this.extractRequirementsFromNotes(project.notes);
    
    return {
      id: project.id,
      orderNumber: project.id.substring(0, 8), // Use part of ID as order number
      organizationId: project.orgId,
      clientName: project.customer?.name || 'Unassigned',
      customerId: project.customerId || undefined,
      customer: project.customer || null, // Include full customer object for linked user checks
      projectManagerId: project.projectManagerId || null,
      projectManager: project.projectManager
        ? {
            id: project.projectManager.id,
            name: project.projectManager.name,
            avatarUrl: (project.projectManager as any)?.avatarUrl,
            email: project.projectManager.email,
          }
        : null,
      editorId: project.editorId || null,
      editor: project.editor
        ? {
            id: project.editor.id,
            name: project.editor.name,
            avatarUrl: (project.editor as any)?.avatarUrl,
            email: project.editor.email,
          }
        : null,
      propertyAddress: propertyAddress,
      location: location,
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      scheduledTime: scheduledDate.toTimeString().substring(0, 5),
      mediaType: ['photo'], // Default as backend media relation might be complex
      priority: 'standard',
      status: this.projectStatusToJobStatus(project.status, project.technicianId),
      assignedTechnicianId: project.technicianId,
      estimatedDuration: 120, // Default duration
      requirements: requirements,
      createdBy: project.projectManagerId || 'system',
      createdAt: new Date(project.createdAt),
      assignedAt: project.technicianId ? new Date(project.updatedAt) : undefined,
      propertyImage: 'https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?w=800', // Default image
      media: project.media || [],
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

  // Orders API - Create Order system
  orders = {
    create: async (payload: {
      customerId?: string;
      newCustomer?: {
        name: string;
        email?: string;
        phone?: string;
        notes?: string;
      };
      addressLine1: string;
      addressLine2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      countryCode?: string;
      lat?: number;
      lng?: number;
      scheduledTime: string;
      estimatedDuration?: number;
      mediaTypes: string[];
      priority: 'standard' | 'rush' | 'urgent';
      notes?: string;
      technicianId?: string;
      editorId?: string;
      projectManagerId?: string;
    }): Promise<{
      project: Project;
      customer: any;
      calendarEvent: any;
      isNewCustomer: boolean;
    }> => {
      if (USE_MOCK_DATA) {
        const now = new Date();
        return {
          project: {
            id: `proj-${Date.now()}`,
            orgId: 'org-mock',
            addressLine1: payload.addressLine1,
            scheduledTime: new Date(payload.scheduledTime),
            status: ProjectStatus.BOOKED,
            createdAt: now,
            updatedAt: now,
          } as Project,
          customer: payload.customerId ? { id: payload.customerId } : payload.newCustomer,
          calendarEvent: null,
          isNewCustomer: !payload.customerId,
        };
      }
      const result = await this.request<any>('/orders/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return {
        ...result,
        project: this.normalizeProject(result.project),
      };
    },

    list: async (): Promise<Project[]> => {
      if (USE_MOCK_DATA) {
        return [];
      }
      const orders = await this.request<any[]>('/orders');
      return orders.map((o) => this.normalizeProject(o));
    },
  };

  // Availability API - Check technician availability
  availability = {
    check: async (params: {
      startDate: string;
      endDate: string;
      technicianIds?: string[];
      duration?: number;
    }): Promise<{
      technicianId: string;
      technicianName: string;
      slots: { start: Date; end: Date; available: boolean }[];
    }[]> => {
      if (USE_MOCK_DATA) {
        return [];
      }
      const query = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        duration: (params.duration || 60).toString(),
      });
      if (params.technicianIds && params.technicianIds.length > 0) {
        query.append('technicianIds', params.technicianIds.join(','));
      }
      const data = await this.request<any[]>(`/availability?${query}`);
      return data.map((t) => ({
        ...t,
        slots: t.slots.map((s: any) => ({
          ...s,
          start: new Date(s.start),
          end: new Date(s.end),
        })),
      }));
    },

    checkSlot: async (params: {
      technicianId: string;
      scheduledTime: string;
      duration?: number;
    }): Promise<{ available: boolean }> => {
      if (USE_MOCK_DATA) {
        return { available: true };
      }
      const query = new URLSearchParams({
        technicianId: params.technicianId,
        scheduledTime: params.scheduledTime,
        duration: (params.duration || 60).toString(),
      });
      return this.request<{ available: boolean }>(`/availability/check?${query}`);
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

  // =============================
  // Notifications API
  // =============================
  notifications = {
    /**
     * Get all notifications for the current user (invitations + project assignments)
     */
    list: async (): Promise<NotificationItem[]> => {
      if (USE_MOCK_DATA) {
        return [];
      }
      const notifications = await this.request<any[]>('/me/notifications');
      return notifications.map((n) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        readAt: n.readAt ? new Date(n.readAt) : null,
      }));
    },

    /**
     * Mark a notification as read
     */
    markRead: async (id: string): Promise<void> => {
      if (USE_MOCK_DATA) return;
      await this.request(`/notifications/${id}/read`, { method: 'POST' });
    },
  };

  // =============================
  // Invitations API
  // =============================
  invitations = {
    /**
     * Accept an invitation
     */
    accept: async (id: string): Promise<void> => {
      if (USE_MOCK_DATA) return;
      await this.request(`/invitations/${id}/accept`, { method: 'POST' });
    },

    /**
     * Decline an invitation
     */
    decline: async (id: string): Promise<void> => {
      if (USE_MOCK_DATA) return;
      await this.request(`/invitations/${id}/decline`, { method: 'POST' });
    },

    /**
     * Get public organization info for viewing from an invitation
     */
    getOrganizationPublic: async (orgId: string): Promise<OrganizationPublicInfo> => {
      if (USE_MOCK_DATA) {
        return {
          id: orgId,
          name: 'Mock Organization',
          type: 'COMPANY',
        };
      }
      return this.request<OrganizationPublicInfo>(`/organizations/${orgId}/public`);
    },
  };

  private mockUserFromEmail(email: string): User {
    const lower = email.toLowerCase();
    const roleMap: Record<string, User['accountType']> = {
      company: 'COMPANY',
      technician: 'PROVIDER',
      agent: 'AGENT',
    };
    const matchedKey = Object.keys(roleMap).find((key) => lower.includes(key));
    const accountTypeRaw = matchedKey ? roleMap[matchedKey] : (currentUser as any).accountType;
    const accountType =
      (accountTypeRaw as string)?.toUpperCase() === 'COMPANY'
        ? 'COMPANY'
        : (accountTypeRaw as User['accountType']);
    return {
      ...currentUser,
      email,
      accountType,
      name: `${accountType} User`,
    };
  }
}

export const api = new ApiClient(API_URL);
