import { User, Metrics, JobRequest, Technician, AuditLogEntry } from '@/types';
import { 
  currentUser, 
  jobRequests, 
  technicians, 
  auditLog, 
  metrics 
} from '@/lib/mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('organizationId');
          // Optional: Redirect to login or dispatch event
          // window.location.href = '/login'; 
        }
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    return response.json();
  }

  auth = {
    login: async (credentials: { email: string; password: string }) => {
      if (USE_MOCK_DATA) {
        // Simulate login delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          token: 'mock-token',
          user: currentUser
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
        return currentUser;
      }
      return this.request<User>('/auth/me');
    },
  };

  dashboard = {
    get: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          jobs: jobRequests,
          photographers: technicians,
          auditLog: auditLog,
          metrics: metrics,
        };
      }
      
      const response = await this.request<any>('/dashboard');
      
      // Map backend role-based dashboard to frontend structure
      let jobs: JobRequest[] = [];
      let mappedMetrics: Metrics = { ...metrics }; // Fallback to mock metrics structure for shape
      
      if (response.role === 'AGENT') {
        const upcoming = response.upcomingShoots || [];
        const delivered = response.deliveredProjects || [];
        jobs = [...upcoming, ...delivered].map(this.mapProjectToJobRequest);
      } else if (response.role === 'TECHNICIAN') {
        const assigned = response.assignedShoots || [];
        const completed = response.recentCompleted || [];
        jobs = [...assigned, ...completed].map(this.mapProjectToJobRequest);
      } else if (response.role === 'EDITOR') {
        const queue = response.editingQueue || [];
        const delivered = response.recentlyDelivered || [];
        jobs = [...queue, ...delivered].map(this.mapProjectToJobRequest);
      } else if (response.role === 'PROJECT_MANAGER' || response.role === 'ADMIN') {
        const pipeline = response.pipeline || {};
        const booked = pipeline.booked || [];
        const shooting = pipeline.shooting || [];
        const editing = pipeline.editing || [];
        const delivered = pipeline.delivered || [];
        jobs = [...booked, ...shooting, ...editing, ...delivered].map(this.mapProjectToJobRequest);
        
        if (response.counts) {
           mappedMetrics = {
             ...mappedMetrics,
             jobs: {
               total: (response.counts.booked || 0) + (response.counts.shooting || 0) + (response.counts.editing || 0) + (response.counts.delivered || 0),
               pending: response.counts.booked || 0,
               assigned: response.counts.shooting || 0,
               completed: response.counts.delivered || 0,
               cancelled: 0
             }
           };
        }
      }

      return {
        jobs,
        photographers: [], // Backend dashboard doesn't return this, would need separate call
        auditLog: [], // Backend doesn't return this
        metrics: mappedMetrics,
      };
    },
  };

  jobs = {
    getAll: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return jobRequests;
      }
      const projects = await this.request<any[]>('/projects/mine');
      return projects.map(this.mapProjectToJobRequest);
    },
    getById: async (id: string) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const job = jobRequests.find(j => j.id === id);
        if (!job) throw new Error('Job not found');
        return job;
      }
      const project = await this.request<any>(`/projects/${id}`);
      return this.mapProjectToJobRequest(project);
    },
  };

  calendar = {
    getEvents: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return jobRequests.map(job => ({
          id: job.id,
          title: `${job.clientName} - ${job.propertyAddress}`,
          start: new Date(`${job.scheduledDate}T${job.scheduledTime}`),
          end: new Date(new Date(`${job.scheduledDate}T${job.scheduledTime}`).getTime() + job.estimatedDuration * 60000),
          resourceId: job.assignedTechnicianId,
        }));
      }
      // Fetch projects and map to calendar events
      const projects = await this.request<any[]>('/projects/mine');
      return projects.map(project => {
        const job = this.mapProjectToJobRequest(project);
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

  // Helper to map backend Project to frontend JobRequest
  private mapProjectToJobRequest(project: any): JobRequest {
    const scheduledDate = project.scheduledTime ? new Date(project.scheduledTime) : new Date();
    
    return {
      id: project.id,
      orderNumber: project.id.substring(0, 8), // Use part of ID as order number
      organizationId: project.orgId,
      clientName: project.agent?.name || 'Unknown Client',
      propertyAddress: project.address || '',
      location: { lat: 51.0447, lng: -114.0719 }, // Default location
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      scheduledTime: scheduledDate.toTimeString().substring(0, 5),
      mediaType: ['photo'], // Default as backend media relation might be complex
      priority: 'standard',
      status: (project.status?.toLowerCase() as any) || 'pending',
      assignedTechnicianId: project.technicianId,
      estimatedDuration: 120, // Default duration
      requirements: project.notes || '',
      createdBy: project.agentId || 'system',
      createdAt: new Date(project.createdAt),
      assignedAt: project.technicianId ? new Date(project.updatedAt) : undefined,
      propertyImage: 'https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?w=800', // Default image
    };
  }
}

export const api = new ApiClient(API_URL);
