import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { AuthorizationService } from '../auth/authorization.service';
import { OrgContext, AuthenticatedUser } from '../auth/auth-context';
import { CreateOrderDto, OrderPriority } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let authorizationService: AuthorizationService;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    accountType: 'AGENT',
    personalOrgId: 'personal-org-1',
  };

  const mockTeamOrgContext: OrgContext = {
    org: {
      id: 'team-org-1',
      name: 'Team Org',
      type: 'TEAM',
      createdAt: new Date(),
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      countryCode: null,
      lat: null,
      lng: null,
      legalName: null,
      logoUrl: null,
      phone: null,
      primaryEmail: null,
      serviceArea: null,
      slug: null,
      timezone: null,
      websiteUrl: null,
    },
    membership: {
      id: 'member-1',
      userId: 'user-1',
      orgId: 'team-org-1',
      role: 'OWNER',
      createdAt: new Date(),
    },
    effectiveRole: 'OWNER',
    isPersonalOrg: false,
    isTeamOrg: true,
    isCompanyOrg: false,
  };

  const mockPersonalOrgContext: OrgContext = {
    org: {
      id: 'personal-org-1',
      name: 'Personal Org',
      type: 'PERSONAL',
      createdAt: new Date(),
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      countryCode: null,
      lat: null,
      lng: null,
      legalName: null,
      logoUrl: null,
      phone: null,
      primaryEmail: null,
      serviceArea: null,
      slug: null,
      timezone: null,
      websiteUrl: null,
    },
    membership: {
      id: 'member-2',
      userId: 'user-1',
      orgId: 'personal-org-1',
      role: 'OWNER',
      createdAt: new Date(),
    },
    effectiveRole: 'PERSONAL_OWNER',
    isPersonalOrg: true,
    isTeamOrg: false,
    isCompanyOrg: false,
  };

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    organizationCustomer: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockCronofyService = {
    createEvent: jest.fn(),
  };

  const mockAuthorizationService = {
    canCreateOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CronofyService, useValue: mockCronofyService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    authorizationService = module.get<AuthorizationService>(AuthorizationService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const validDto: CreateOrderDto = {
      newCustomer: {
        name: 'Test Customer',
        email: 'customer@test.com',
      },
      addressLine1: '123 Test Street',
      city: 'Test City',
      scheduledTime: new Date(Date.now() + 86400000).toISOString(),
      mediaTypes: ['photo', 'video'],
      priority: OrderPriority.STANDARD,
    };

    it('should throw ForbiddenException if user cannot create orders', async () => {
      mockAuthorizationService.canCreateOrder.mockReturnValue(false);

      await expect(
        service.createOrder(mockTeamOrgContext, mockUser, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if no customer provided', async () => {
      mockAuthorizationService.canCreateOrder.mockReturnValue(true);

      const dtoWithoutCustomer = {
        ...validDto,
        customerId: undefined,
        newCustomer: undefined,
      };

      await expect(
        service.createOrder(mockTeamOrgContext, mockUser, dtoWithoutCustomer as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no media types provided', async () => {
      mockAuthorizationService.canCreateOrder.mockReturnValue(true);

      const dtoWithoutMedia = {
        ...validDto,
        mediaTypes: [],
      };

      await expect(
        service.createOrder(mockTeamOrgContext, mockUser, dtoWithoutMedia),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create order with new customer for TEAM org', async () => {
      mockAuthorizationService.canCreateOrder.mockReturnValue(true);
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.organizationCustomer.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationCustomer.create.mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
        email: 'customer@test.com',
        orgId: 'team-org-1',
      });
      mockPrismaService.project.create.mockResolvedValue({
        id: 'project-1',
        orgId: 'team-org-1',
        customerId: 'customer-1',
        addressLine1: '123 Test Street',
        scheduledTime: new Date(validDto.scheduledTime),
        status: 'BOOKED',
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        orgId: 'team-org-1',
        customerId: 'customer-1',
        customer: { id: 'customer-1', name: 'Test Customer' },
        calendarEvent: null,
      });

      const result = await service.createOrder(mockTeamOrgContext, mockUser, validDto);

      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('isNewCustomer', true);
      expect(mockPrismaService.organizationCustomer.create).toHaveBeenCalled();
    });

    it('should use existing customer when customerId provided', async () => {
      mockAuthorizationService.canCreateOrder.mockReturnValue(true);
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.organizationCustomer.findFirst.mockResolvedValue({
        id: 'existing-customer',
        name: 'Existing Customer',
        orgId: 'team-org-1',
      });
      mockPrismaService.project.create.mockResolvedValue({
        id: 'project-1',
        orgId: 'team-org-1',
        customerId: 'existing-customer',
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        customer: { id: 'existing-customer' },
        calendarEvent: null,
      });

      const dtoWithExistingCustomer = {
        ...validDto,
        customerId: 'existing-customer',
        newCustomer: undefined,
      };

      const result = await service.createOrder(
        mockTeamOrgContext,
        mockUser,
        dtoWithExistingCustomer,
      );

      expect(result.isNewCustomer).toBe(false);
      expect(mockPrismaService.organizationCustomer.create).not.toHaveBeenCalled();
    });

    it('should auto-assign technician for PERSONAL org', async () => {
      mockAuthorizationService.canCreateOrder.mockReturnValue(true);
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.organizationCustomer.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationCustomer.create.mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
        orgId: 'personal-org-1',
      });
      mockPrismaService.project.create.mockResolvedValue({
        id: 'project-1',
        orgId: 'personal-org-1',
        technicianId: mockUser.id, // Should be auto-assigned
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        technicianId: mockUser.id,
        calendarEvent: null,
      });

      await service.createOrder(mockPersonalOrgContext, mockUser, validDto);

      expect(mockPrismaService.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            technicianId: mockUser.id,
          }),
        }),
      );
    });

    it('should detect scheduling conflicts', async () => {
      mockAuthorizationService.canCreateOrder.mockReturnValue(true);
      mockPrismaService.project.findMany.mockResolvedValue([
        {
          id: 'existing-project',
          scheduledTime: new Date(validDto.scheduledTime),
          technicianId: 'tech-1',
        },
      ]);

      const dtoWithTechnician = {
        ...validDto,
        technicianId: 'tech-1',
      };

      await expect(
        service.createOrder(mockTeamOrgContext, mockUser, dtoWithTechnician),
      ).rejects.toThrow(ConflictException);
    });
  });
});

