import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarIntegrationStatus, CalendarProvider, CalendarEventSyncStatus } from '@prisma/client';

// Nylas API v3 base URL
const NYLAS_API_BASE = 'https://api.us.nylas.com/v3';

export interface NylasCalendar {
  id: string;
  grant_id: string;
  name: string;
  description?: string;
  is_primary: boolean;
  read_only: boolean;
  timezone?: string;
}

interface NylasEvent {
  id: string;
  calendar_id: string;
  grant_id: string;
  title: string;
  description?: string;
  location?: string;
  when: {
    start_time?: number;
    end_time?: number;
    start_date?: string;
    end_date?: string;
    object: 'timespan' | 'datespan' | 'date';
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  busy?: boolean;
  participants?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  metadata?: Record<string, string>;
}

interface NylasFreeBusy {
  email: string;
  time_slots: Array<{
    start_time: number;
    end_time: number;
    status: 'busy' | 'free';
    object: string;
  }>;
}

interface NylasAuthResponse {
  grant_id: string;
  email: string;
  provider: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

@Injectable()
export class NylasService {
  private readonly logger = new Logger(NylasService.name);
  private readonly apiKey: string;
  private readonly clientId: string;
  private readonly callbackUri: string;

  constructor(private prisma: PrismaService) {
    this.apiKey = process.env.NYLAS_API_KEY || '';
    this.clientId = process.env.NYLAS_CLIENT_ID || '';
    this.callbackUri = process.env.NYLAS_CALLBACK_URI || 'http://localhost:3001/nylas/oauth/callback';

    if (!this.apiKey) {
      this.logger.warn('NYLAS_API_KEY not configured - Nylas integration disabled');
    }
  }

  private get isConfigured(): boolean {
    return !!this.apiKey && !!this.clientId;
  }

  private async nylasRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    grantId?: string,
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('Nylas is not configured');
    }

    const url = grantId
      ? `${NYLAS_API_BASE}/grants/${grantId}${endpoint}`
      : `${NYLAS_API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    this.logger.debug(`Nylas API request: ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Nylas API error: ${response.status} ${errorBody}`);
        throw new InternalServerErrorException(
          `Nylas API error: ${response.status} - ${errorBody}`,
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error('Nylas API request failed', error);
      throw new InternalServerErrorException('Failed to communicate with Nylas');
    }
  }

  // =============================
  // OAuth Flow
  // =============================

  /**
   * Generate OAuth URL for connecting a calendar
   */
  getOAuthUrl(userId: string, provider: 'google' | 'microsoft'): string {
    if (!this.isConfigured) {
      throw new BadRequestException('Nylas integration is not configured');
    }

    const state = Buffer.from(JSON.stringify({ userId, provider })).toString('base64');
    const scopes = ['https://www.googleapis.com/auth/calendar'];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUri,
      response_type: 'code',
      state,
      provider: provider === 'microsoft' ? 'microsoft' : 'google',
      access_type: 'offline',
    });

    if (provider === 'google') {
      params.set('scope', scopes.join(' '));
    }

    return `https://api.us.nylas.com/v3/connect/auth?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for grant and store connection
   */
  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; grantId: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Nylas integration is not configured');
    }

    // Decode state to get userId and provider
    let stateData: { userId: string; provider: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    // Exchange code for token
    const tokenResponse = await this.nylasRequest<any>(
      '/connect/token',
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.apiKey,
          code,
          redirect_uri: this.callbackUri,
          grant_type: 'authorization_code',
        }),
      },
    );

    // Nylas v3 returns the grant directly, not wrapped in data
    const responseData = tokenResponse.data || tokenResponse;
    const { grant_id, email, provider } = responseData;

    this.logger.log(`OAuth completed for user ${stateData.userId}, grant ${grant_id}`);

    // Fetch calendars for this grant
    const calendars = await this.listCalendars(grant_id);
    const primaryCalendar = calendars.find(c => c.is_primary) || calendars[0];

    if (!primaryCalendar) {
      throw new BadRequestException('No calendars found for this account');
    }

    // Store the connection
    const calendarProvider = provider === 'microsoft'
      ? CalendarProvider.OUTLOOK
      : CalendarProvider.GOOGLE;

    await this.prisma.userCalendarIntegration.upsert({
      where: {
        userId_provider_calendarId: {
          userId: stateData.userId,
          provider: calendarProvider,
          calendarId: primaryCalendar.id,
        },
      },
      update: {
        nylasGrantId: grant_id,
        nylasCalendarId: primaryCalendar.id,
        calendarName: primaryCalendar.name,
        status: CalendarIntegrationStatus.ACTIVE,
        isPrimary: true,
        isWriteTarget: true,
        lastSyncAt: new Date(),
        lastSyncError: null,
        providerAccountId: email,
      },
      create: {
        userId: stateData.userId,
        provider: calendarProvider,
        calendarId: primaryCalendar.id,
        nylasGrantId: grant_id,
        nylasCalendarId: primaryCalendar.id,
        calendarName: primaryCalendar.name,
        status: CalendarIntegrationStatus.ACTIVE,
        isPrimary: true,
        isWriteTarget: true,
        providerAccountId: email,
        accessToken: '', // Not used for Nylas
      },
    });

    return { userId: stateData.userId, grantId: grant_id };
  }

  /**
   * Disconnect a calendar integration
   */
  async disconnect(userId: string, integrationId: string): Promise<void> {
    const integration = await this.prisma.userCalendarIntegration.findFirst({
      where: { id: integrationId, userId },
    });

    if (!integration) {
      throw new BadRequestException('Integration not found');
    }

    // Clear CalendarEvent records linked to this grant so they can be recreated
    // when the user reconnects their calendar
    if (integration.nylasGrantId) {
      await this.prisma.calendarEvent.updateMany({
        where: { nylasGrantId: integration.nylasGrantId },
        data: {
          nylasEventId: null,
          nylasCalendarId: null,
          nylasGrantId: null,
          syncStatus: CalendarEventSyncStatus.PENDING,
        },
      });
      this.logger.log(`Cleared calendar events for grant ${integration.nylasGrantId}`);
    }

    // Revoke the Nylas grant if it exists
    if (integration.nylasGrantId) {
      try {
        await this.nylasRequest(
          `/grants/${integration.nylasGrantId}`,
          { method: 'DELETE' },
        );
      } catch (error) {
        this.logger.warn(`Failed to revoke Nylas grant: ${error}`);
      }
    }

    // Update status to disconnected
    await this.prisma.userCalendarIntegration.update({
      where: { id: integrationId },
      data: {
        status: CalendarIntegrationStatus.DISCONNECTED,
        nylasGrantId: null,
      },
    });

    this.logger.log(`Disconnected calendar integration ${integrationId} for user ${userId}`);
  }

  // =============================
  // Calendar Operations
  // =============================

  /**
   * List calendars for a grant
   */
  async listCalendars(grantId: string): Promise<NylasCalendar[]> {
    const response = await this.nylasRequest<{ data: NylasCalendar[] }>(
      '/calendars',
      { method: 'GET' },
      grantId,
    );
    return response.data;
  }

  /**
   * Get calendars for a user
   */
  async getUserCalendars(userId: string): Promise<NylasCalendar[]> {
    const integration = await this.getActiveIntegration(userId);
    if (!integration?.nylasGrantId) {
      return [];
    }
    return this.listCalendars(integration.nylasGrantId);
  }

  /**
   * Set the write target calendar
   */
  async setWriteTarget(userId: string, integrationId: string, calendarId: string): Promise<void> {
    // Clear other write targets for this user
    await this.prisma.userCalendarIntegration.updateMany({
      where: { userId, isWriteTarget: true },
      data: { isWriteTarget: false },
    });

    // Set the new write target
    await this.prisma.userCalendarIntegration.update({
      where: { id: integrationId },
      data: {
        isWriteTarget: true,
        nylasCalendarId: calendarId,
      },
    });
  }

  // =============================
  // Availability
  // =============================

  /**
   * Get free/busy information for a user
   */
  async getFreeBusy(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<NylasFreeBusy | null> {
    const integration = await this.getActiveIntegration(userId);
    if (!integration?.nylasGrantId) {
      return null;
    }

    try {
      const response = await this.nylasRequest<{ data: NylasFreeBusy[] }>(
        '/calendars/free-busy',
        {
          method: 'POST',
          body: JSON.stringify({
            start_time: Math.floor(startTime.getTime() / 1000),
            end_time: Math.floor(endTime.getTime() / 1000),
            emails: [integration.providerAccountId],
          }),
        },
        integration.nylasGrantId,
      );

      return response.data[0] || null;
    } catch (error) {
      this.logger.error(`Failed to get free/busy for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Get available time slots for scheduling
   */
  async getAvailableSlots(
    userId: string,
    startTime: Date,
    endTime: Date,
    durationMins: number,
    timezone: string = 'America/New_York',
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const slotDuration = durationMins * 60 * 1000; // Convert to milliseconds
    const businessHours = { start: 8, end: 18 }; // 8 AM to 6 PM

    // Get free/busy from connected calendar
    const freeBusy = await this.getFreeBusy(userId, startTime, endTime);
    const busySlots = freeBusy?.time_slots
      .filter(slot => slot.status === 'busy')
      .map(slot => ({
        start: new Date(slot.start_time * 1000),
        end: new Date(slot.end_time * 1000),
      })) || [];

    // Get user's work hours
    const availability = await this.prisma.userAvailability.findMany({
      where: { userId },
    });
    const availabilityStatus = await this.prisma.userAvailabilityStatus.findUnique({
      where: { userId },
    });

    // If user is marked unavailable, return empty
    if (availabilityStatus && !availabilityStatus.isAvailable) {
      return [];
    }

    // Generate slots for each day in the range
    const current = new Date(startTime);
    while (current < endTime) {
      const dayOfWeek = this.getDayOfWeek(current);
      const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek);

      // Skip if day is not enabled
      if (!dayAvailability?.isEnabled) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      // Parse work hours
      const [startHour, startMin] = dayAvailability.startTime.split(':').map(Number);
      const [endHour, endMin] = dayAvailability.endTime.split(':').map(Number);

      const dayStart = new Date(current);
      dayStart.setHours(startHour, startMin, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(endHour, endMin, 0, 0);

      // Generate slots for this day
      let slotStart = new Date(Math.max(dayStart.getTime(), startTime.getTime()));
      while (slotStart.getTime() + slotDuration <= Math.min(dayEnd.getTime(), endTime.getTime())) {
        const slotEnd = new Date(slotStart.getTime() + slotDuration);

        // Check if slot overlaps with any busy time
        const isAvailable = !busySlots.some(busy =>
          slotStart < busy.end && slotEnd > busy.start
        );

        slots.push({
          start: new Date(slotStart),
          end: slotEnd,
          available: isAvailable,
        });

        // Move to next slot (30-minute increments)
        slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }

    return slots;
  }

  // =============================
  // Event Operations
  // =============================

  /**
   * Create a calendar event
   */
  async createEvent(
    userId: string,
    event: {
      title: string;
      description?: string;
      location?: string;
      startTime: Date;
      endTime: Date;
      metadata?: Record<string, string>;
    },
  ): Promise<NylasEvent | null> {
    const integration = await this.getWriteTargetIntegration(userId);
    if (!integration?.nylasGrantId || !integration?.nylasCalendarId) {
      this.logger.warn(`No write target calendar for user ${userId}`);
      return null;
    }

    try {
      const response = await this.nylasRequest<{ data: NylasEvent }>(
        `/events?calendar_id=${integration.nylasCalendarId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: event.title,
            description: event.description,
            location: event.location,
            when: {
              start_time: Math.floor(event.startTime.getTime() / 1000),
              end_time: Math.floor(event.endTime.getTime() / 1000),
              object: 'timespan',
            },
            metadata: event.metadata,
          }),
        },
        integration.nylasGrantId,
      );

      this.logger.log(`Created Nylas event ${response.data.id} for user ${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create event for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    grantId: string,
    calendarId: string,
    eventId: string,
    updates: {
      title?: string;
      description?: string;
      location?: string;
      startTime?: Date;
      endTime?: Date;
    },
  ): Promise<NylasEvent | null> {
    try {
      const body: Record<string, any> = {};

      if (updates.title) body.title = updates.title;
      if (updates.description) body.description = updates.description;
      if (updates.location) body.location = updates.location;
      if (updates.startTime && updates.endTime) {
        body.when = {
          start_time: Math.floor(updates.startTime.getTime() / 1000),
          end_time: Math.floor(updates.endTime.getTime() / 1000),
          object: 'timespan',
        };
      }

      const response = await this.nylasRequest<{ data: NylasEvent }>(
        `/events/${eventId}?calendar_id=${calendarId}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
        grantId,
      );

      this.logger.log(`Updated Nylas event ${eventId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update event ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    grantId: string,
    calendarId: string,
    eventId: string,
  ): Promise<void> {
    try {
      await this.nylasRequest(
        `/events/${eventId}?calendar_id=${calendarId}`,
        { method: 'DELETE' },
        grantId,
      );

      this.logger.log(`Deleted Nylas event ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to delete event ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Get an event by ID
   */
  async getEvent(
    grantId: string,
    calendarId: string,
    eventId: string,
  ): Promise<NylasEvent | null> {
    try {
      const response = await this.nylasRequest<{ data: NylasEvent }>(
        `/events/${eventId}?calendar_id=${calendarId}`,
        { method: 'GET' },
        grantId,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get event ${eventId}`, error);
      return null;
    }
  }

  // =============================
  // Helpers
  // =============================

  /**
   * Get active calendar integration for a user
   */
  async getActiveIntegration(userId: string) {
    return this.prisma.userCalendarIntegration.findFirst({
      where: {
        userId,
        status: CalendarIntegrationStatus.ACTIVE,
        nylasGrantId: { not: null },
      },
      orderBy: { isPrimary: 'desc' },
    });
  }

  /**
   * Get write target integration for a user
   */
  async getWriteTargetIntegration(userId: string) {
    return this.prisma.userCalendarIntegration.findFirst({
      where: {
        userId,
        status: CalendarIntegrationStatus.ACTIVE,
        isWriteTarget: true,
        nylasGrantId: { not: null },
      },
    });
  }

  /**
   * Check if Nylas is configured
   */
  isNylasConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get connection status for a user
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    integrations: Array<{
      id: string;
      provider: string;
      providerAccountId: string | null;
      calendarName: string | null;
      status: string;
      isWriteTarget: boolean;
      createdAt: Date;
      lastSyncAt: Date | null;
    }>;
  }> {
    const integrations = await this.prisma.userCalendarIntegration.findMany({
      where: {
        userId,
        status: { not: CalendarIntegrationStatus.DISCONNECTED },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      connected: integrations.some(i => i.status === CalendarIntegrationStatus.ACTIVE),
      integrations: integrations.map(i => ({
        id: i.id,
        provider: i.provider,
        providerAccountId: i.providerAccountId,
        calendarName: i.calendarName,
        status: i.status,
        isWriteTarget: i.isWriteTarget,
        createdAt: i.createdAt,
        lastSyncAt: i.lastSyncAt,
      })),
    };
  }

  private getDayOfWeek(date: Date): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }
}
