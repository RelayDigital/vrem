import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfWeek } from '@prisma/client';
import { AvailabilityStatusDto, WorkHoursDto } from './dto';

export interface UserAvailabilityResponse {
  status: {
    isAvailable: boolean;
    availabilityNote: string | null;
    autoDeclineBookings: boolean;
  };
  workHours: {
    dayOfWeek: DayOfWeek;
    isEnabled: boolean;
    startTime: string;
    endTime: string;
  }[];
}

const DEFAULT_WORK_HOURS: Omit<WorkHoursDto, 'dayOfWeek'>[] = [
  { isEnabled: true, startTime: '09:00', endTime: '17:00' }, // Monday
  { isEnabled: true, startTime: '09:00', endTime: '17:00' }, // Tuesday
  { isEnabled: true, startTime: '09:00', endTime: '17:00' }, // Wednesday
  { isEnabled: true, startTime: '09:00', endTime: '17:00' }, // Thursday
  { isEnabled: true, startTime: '09:00', endTime: '17:00' }, // Friday
  { isEnabled: false, startTime: '09:00', endTime: '17:00' }, // Saturday
  { isEnabled: false, startTime: '09:00', endTime: '17:00' }, // Sunday
];

const DAYS_ORDER: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user's availability settings (status + work hours)
   */
  async getUserAvailability(userId: string): Promise<UserAvailabilityResponse> {
    // Get or create status
    let status = await this.prisma.userAvailabilityStatus.findUnique({
      where: { userId },
    });

    if (!status) {
      status = await this.prisma.userAvailabilityStatus.create({
        data: {
          userId,
          isAvailable: true,
          autoDeclineBookings: false,
        },
      });
    }

    // Get work hours
    let workHours = await this.prisma.userAvailability.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
    });

    // If no work hours exist, create default ones
    if (workHours.length === 0) {
      await this.createDefaultWorkHours(userId);
      workHours = await this.prisma.userAvailability.findMany({
        where: { userId },
        orderBy: { dayOfWeek: 'asc' },
      });
    }

    // Sort by day order
    const sortedWorkHours = DAYS_ORDER.map((day) => {
      const existing = workHours.find((wh) => wh.dayOfWeek === day);
      return existing || {
        dayOfWeek: day,
        isEnabled: false,
        startTime: '09:00',
        endTime: '17:00',
      };
    });

    return {
      status: {
        isAvailable: status.isAvailable,
        availabilityNote: status.availabilityNote,
        autoDeclineBookings: status.autoDeclineBookings,
      },
      workHours: sortedWorkHours.map((wh) => ({
        dayOfWeek: wh.dayOfWeek,
        isEnabled: wh.isEnabled,
        startTime: wh.startTime,
        endTime: wh.endTime,
      })),
    };
  }

  /**
   * Update user's availability status
   */
  async updateAvailabilityStatus(
    userId: string,
    dto: AvailabilityStatusDto,
  ): Promise<UserAvailabilityResponse> {
    await this.prisma.userAvailabilityStatus.upsert({
      where: { userId },
      update: {
        isAvailable: dto.isAvailable,
        availabilityNote: dto.availabilityNote,
        autoDeclineBookings: dto.autoDeclineBookings ?? false,
      },
      create: {
        userId,
        isAvailable: dto.isAvailable,
        availabilityNote: dto.availabilityNote,
        autoDeclineBookings: dto.autoDeclineBookings ?? false,
      },
    });

    return this.getUserAvailability(userId);
  }

  /**
   * Update work hours for a specific day
   */
  async updateWorkHours(
    userId: string,
    dto: WorkHoursDto,
  ): Promise<UserAvailabilityResponse> {
    await this.prisma.userAvailability.upsert({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek: dto.dayOfWeek,
        },
      },
      update: {
        isEnabled: dto.isEnabled,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      create: {
        userId,
        dayOfWeek: dto.dayOfWeek,
        isEnabled: dto.isEnabled,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });

    return this.getUserAvailability(userId);
  }

  /**
   * Update all work hours at once
   */
  async updateAllWorkHours(
    userId: string,
    workHours: WorkHoursDto[],
  ): Promise<UserAvailabilityResponse> {
    // Use transaction to update all days
    await this.prisma.$transaction(
      workHours.map((wh) =>
        this.prisma.userAvailability.upsert({
          where: {
            userId_dayOfWeek: {
              userId,
              dayOfWeek: wh.dayOfWeek,
            },
          },
          update: {
            isEnabled: wh.isEnabled,
            startTime: wh.startTime,
            endTime: wh.endTime,
          },
          create: {
            userId,
            dayOfWeek: wh.dayOfWeek,
            isEnabled: wh.isEnabled,
            startTime: wh.startTime,
            endTime: wh.endTime,
          },
        }),
      ),
    );

    return this.getUserAvailability(userId);
  }

  /**
   * Check if a user is available at a specific date/time
   */
  async isUserAvailableAt(
    userId: string,
    dateTime: Date,
  ): Promise<{ available: boolean; reason?: string }> {
    const availability = await this.getUserAvailability(userId);

    // Check overall availability
    if (!availability.status.isAvailable) {
      return {
        available: false,
        reason: availability.status.availabilityNote || 'User is marked as unavailable',
      };
    }

    // Get day of week from the date
    const dayIndex = dateTime.getDay();
    const dayMap: Record<number, DayOfWeek> = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };
    const dayOfWeek = dayMap[dayIndex];

    // Find work hours for this day
    const dayWorkHours = availability.workHours.find(
      (wh) => wh.dayOfWeek === dayOfWeek,
    );

    if (!dayWorkHours || !dayWorkHours.isEnabled) {
      return {
        available: false,
        reason: `User does not work on ${dayOfWeek.toLowerCase()}s`,
      };
    }

    // Check if the time falls within work hours
    const timeString = dateTime.toTimeString().slice(0, 5); // HH:mm
    if (timeString < dayWorkHours.startTime || timeString >= dayWorkHours.endTime) {
      return {
        available: false,
        reason: `Outside work hours (${dayWorkHours.startTime} - ${dayWorkHours.endTime})`,
      };
    }

    return { available: true };
  }

  /**
   * Get available users for a specific time slot
   */
  async getAvailableUsers(
    userIds: string[],
    dateTime: Date,
  ): Promise<string[]> {
    const availableUserIds: string[] = [];

    for (const userId of userIds) {
      const result = await this.isUserAvailableAt(userId, dateTime);
      if (result.available) {
        availableUserIds.push(userId);
      }
    }

    return availableUserIds;
  }

  /**
   * Create default work hours for a user
   */
  private async createDefaultWorkHours(userId: string): Promise<void> {
    const createData = DAYS_ORDER.map((day, index) => ({
      userId,
      dayOfWeek: day,
      isEnabled: DEFAULT_WORK_HOURS[index].isEnabled,
      startTime: DEFAULT_WORK_HOURS[index].startTime,
      endTime: DEFAULT_WORK_HOURS[index].endTime,
    }));

    await this.prisma.userAvailability.createMany({
      data: createData,
      skipDuplicates: true,
    });
  }
}
