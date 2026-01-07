import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AvailabilityService } from '../availability/availability.service';
import { CalendarSyncService } from '../nylas/calendar-sync.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { OrgContext, AuthenticatedUser } from '../auth/auth-context';
import { OrgType, UserAccountType } from '@prisma/client';

describe('ProjectsService.findForUser', () => {
  let service: ProjectsService;
  let prisma: jest.Mocked<PrismaService>;

  // Helper to create mock OrgContext
  const createOrgContext = (overrides: Partial<OrgContext> = {}): OrgContext => ({
    org: {
      id: 'org-123',
      name: 'Test Org',
      type: OrgType.COMPANY,
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionPlan: null,
      subscriptionStatus: null,
      logo: null,
      brandColor: null,
      brandingSettings: null,
    },
    membership: null,
    effectiveRole: 'OWNER',
    isPersonalOrg: false,
    isTeamOrg: false,
    isCompanyOrg: true,
    ...overrides,
  });

  // Helper to create mock AuthenticatedUser
  const createUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    accountType: UserAccountType.PROVIDER,
    personalOrgId: 'personal-org-123',
    ...overrides,
  });

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      organizationCustomer: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      organizationMember: {
        findFirst: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        AuthorizationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CronofyService,
          useValue: {
            syncProjectToCalendar: jest.fn(),
            createEvent: jest.fn(),
            updateEvent: jest.fn(),
          },
        },
        {
          provide: AvailabilityService,
          useValue: {
            getAvailability: jest.fn(),
          },
        },
        {
          provide: CalendarSyncService,
          useValue: {
            syncEvent: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get(PrismaService);
  });

  describe('Input Validation', () => {
    it('should throw BadRequestException when user is null', async () => {
      const ctx = createOrgContext();
      await expect(service.findForUser(ctx, null as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user.id is missing', async () => {
      const ctx = createOrgContext();
      const user = createUser({ id: undefined as any });
      await expect(service.findForUser(ctx, user)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when ctx is null', async () => {
      const user = createUser();
      await expect(service.findForUser(null as any, user)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when ctx.org is null', async () => {
      const user = createUser();
      const ctx = { ...createOrgContext(), org: null as any };
      await expect(service.findForUser(ctx, user)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when ctx.org.id is missing', async () => {
      const user = createUser();
      const ctx = createOrgContext();
      ctx.org.id = undefined as any;
      await expect(service.findForUser(ctx, user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('User with only personal org and no projects', () => {
    it('should return empty array for PROVIDER in personal org with no projects', async () => {
      const user = createUser({ accountType: UserAccountType.PROVIDER });
      const ctx = createOrgContext({
        org: {
          ...createOrgContext().org,
          id: 'personal-org-123',
          type: OrgType.PERSONAL,
        },
        isPersonalOrg: true,
        effectiveRole: 'PERSONAL_OWNER',
      });

      prisma.project.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'personal-org-123' },
        }),
      );
    });

    it('should return empty array for AGENT in personal org with no customer records', async () => {
      const user = createUser({
        accountType: UserAccountType.AGENT,
        personalOrgId: 'personal-org-123',
      });
      const ctx = createOrgContext({
        org: {
          ...createOrgContext().org,
          id: 'personal-org-123',
          type: OrgType.PERSONAL,
        },
        isPersonalOrg: true,
        effectiveRole: 'PERSONAL_OWNER',
      });

      prisma.organizationCustomer.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
      expect(prisma.organizationCustomer.findMany).toHaveBeenCalledWith({
        where: { userId: user.id },
        select: { id: true },
      });
    });
  });

  describe('User with company org membership and no projects', () => {
    it('should return empty array for OWNER with no projects', async () => {
      const user = createUser();
      const ctx = createOrgContext({ effectiveRole: 'OWNER' });

      prisma.project.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-123' },
        }),
      );
    });

    it('should return empty array for ADMIN with no projects', async () => {
      const user = createUser();
      const ctx = createOrgContext({ effectiveRole: 'ADMIN' });

      prisma.project.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
    });

    it('should return empty array for TECHNICIAN with no assigned projects', async () => {
      const user = createUser();
      const ctx = createOrgContext({ effectiveRole: 'TECHNICIAN' });

      prisma.project.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-123', technicianId: user.id },
        }),
      );
    });

    it('should return empty array for EDITOR with no assigned projects', async () => {
      const user = createUser();
      const ctx = createOrgContext({ effectiveRole: 'EDITOR' });

      prisma.project.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-123', editorId: user.id },
        }),
      );
    });
  });

  describe('Agent with customer access to project in another org', () => {
    it('should return customer-assigned projects when AGENT is in personal org', async () => {
      const user = createUser({
        accountType: UserAccountType.AGENT,
        personalOrgId: 'agent-personal-org',
      });
      const ctx = createOrgContext({
        org: {
          ...createOrgContext().org,
          id: 'agent-personal-org',
          type: OrgType.PERSONAL,
        },
        isPersonalOrg: true,
        effectiveRole: 'PERSONAL_OWNER',
      });

      // Mock customer records in another org
      prisma.organizationCustomer.findMany.mockResolvedValue([
        { id: 'customer-record-1' },
        { id: 'customer-record-2' },
      ]);

      // Mock projects assigned to those customers
      const mockProjects = [
        {
          id: 'project-1',
          orgId: 'company-org-abc',
          customerId: 'customer-record-1',
          addressLine1: '123 Test St',
        },
        {
          id: 'project-2',
          orgId: 'company-org-xyz',
          customerId: 'customer-record-2',
          addressLine1: '456 Test Ave',
        },
      ];
      prisma.project.findMany.mockResolvedValue(mockProjects as any);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual(mockProjects);
      expect(prisma.organizationCustomer.findMany).toHaveBeenCalledWith({
        where: { userId: user.id },
        select: { id: true },
      });
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            customerId: { in: ['customer-record-1', 'customer-record-2'] },
          },
        }),
      );
    });

    it('should return customer-assigned projects when AGENT accesses non-personal org without membership', async () => {
      const user = createUser({
        accountType: UserAccountType.AGENT,
        personalOrgId: 'agent-personal-org',
      });
      // AGENT accessing a company org where they're not a member (effectiveRole = NONE)
      const ctx = createOrgContext({
        org: {
          ...createOrgContext().org,
          id: 'company-org-abc',
          type: OrgType.COMPANY,
        },
        isPersonalOrg: false,
        isCompanyOrg: true,
        effectiveRole: 'NONE',
        membership: null,
      });

      // Mock customer records in this specific org
      prisma.organizationCustomer.findMany.mockResolvedValue([
        { id: 'customer-record-in-company' },
      ]);

      // Mock projects in that org
      const mockProjects = [
        {
          id: 'project-in-company',
          orgId: 'company-org-abc',
          customerId: 'customer-record-in-company',
          addressLine1: '789 Company Blvd',
        },
      ];
      prisma.project.findMany.mockResolvedValue(mockProjects as any);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual(mockProjects);
      expect(prisma.organizationCustomer.findMany).toHaveBeenCalledWith({
        where: { userId: user.id, orgId: 'company-org-abc' },
        select: { id: true },
      });
    });

    it('should return empty array when AGENT has no customer records in the org', async () => {
      const user = createUser({
        accountType: UserAccountType.AGENT,
        personalOrgId: 'agent-personal-org',
      });
      const ctx = createOrgContext({
        org: {
          ...createOrgContext().org,
          id: 'company-org-xyz',
          type: OrgType.COMPANY,
        },
        isPersonalOrg: false,
        effectiveRole: 'NONE',
        membership: null,
      });

      prisma.organizationCustomer.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
    });
  });

  describe('Missing membership in non-personal org', () => {
    it('should throw ForbiddenException for PROVIDER with effectiveRole=NONE', async () => {
      const user = createUser({ accountType: UserAccountType.PROVIDER });
      const ctx = createOrgContext({
        effectiveRole: 'NONE',
        membership: null,
      });

      await expect(service.findForUser(ctx, user)).rejects.toThrow(ForbiddenException);
      await expect(service.findForUser(ctx, user)).rejects.toThrow(
        'You are not a member of this organization',
      );
    });

    it('should NOT throw for AGENT with effectiveRole=NONE (returns empty)', async () => {
      const user = createUser({ accountType: UserAccountType.AGENT });
      const ctx = createOrgContext({
        effectiveRole: 'NONE',
        membership: null,
        isPersonalOrg: false,
      });

      prisma.organizationCustomer.findMany.mockResolvedValue([]);

      // Should not throw - returns empty array instead
      const result = await service.findForUser(ctx, user);
      expect(result).toEqual([]);
    });
  });

  describe('Role-based access', () => {
    it('should query all org projects for PROJECT_MANAGER role', async () => {
      const user = createUser();
      const ctx = createOrgContext({ effectiveRole: 'PROJECT_MANAGER' });

      const mockProjects = [{ id: 'p1' }, { id: 'p2' }];
      prisma.project.findMany.mockResolvedValue(mockProjects as any);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual(mockProjects);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-123' },
        }),
      );
    });

    it('should only return assigned projects for TECHNICIAN', async () => {
      const user = createUser({ id: 'tech-user-123' });
      const ctx = createOrgContext({ effectiveRole: 'TECHNICIAN' });

      const mockProjects = [{ id: 'assigned-project', technicianId: 'tech-user-123' }];
      prisma.project.findMany.mockResolvedValue(mockProjects as any);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual(mockProjects);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-123', technicianId: 'tech-user-123' },
        }),
      );
    });
  });

  describe('Error handling', () => {
    it('should return 200 with empty array, not 500, when no results found', async () => {
      const user = createUser();
      const ctx = createOrgContext({ effectiveRole: 'OWNER' });

      prisma.project.findMany.mockResolvedValue([]);

      const result = await service.findForUser(ctx, user);

      expect(result).toEqual([]);
      // No exception thrown
    });

    it('should wrap Prisma errors appropriately', async () => {
      const user = createUser();
      const ctx = createOrgContext({ effectiveRole: 'OWNER' });

      const prismaError = new Error('Database connection failed');
      (prismaError as any).code = 'P1001';
      prisma.project.findMany.mockRejectedValue(prismaError);

      await expect(service.findForUser(ctx, user)).rejects.toMatchObject({
        status: 500,
      });
    });
  });
});
