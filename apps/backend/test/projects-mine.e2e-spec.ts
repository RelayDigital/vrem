import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OrgType, OrgRole, UserAccountType } from '@prisma/client';

/**
 * Integration tests for GET /projects/mine endpoint
 *
 * Tests cover:
 * - User with only personal org and no projects
 * - User with company org membership and no projects
 * - Agent with customer access to project in another org
 * - Invalid org header
 * - Missing membership in non-personal org
 */
describe('GET /projects/mine (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test data holders
  const testData: {
    providerUser?: any;
    agentUser?: any;
    providerPersonalOrg?: any;
    agentPersonalOrg?: any;
    companyOrg?: any;
    projectInCompany?: any;
    customerRecord?: any;
    tokens: Record<string, string>;
  } = {
    tokens: {},
  };

  const TEST_PREFIX = `e2e-pm-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // ================================
    // Setup test data
    // ================================

    // Create PROVIDER user (for personal org tests)
    testData.providerUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-provider@example.com`,
        name: 'Provider User',
        password: 'hashed_password',
        accountType: UserAccountType.PROVIDER,
      },
    });

    // Create personal org for provider
    testData.providerPersonalOrg = await prisma.organization.create({
      data: {
        id: `${TEST_PREFIX}-provider-personal`,
        name: 'Provider Personal Org',
        type: OrgType.PERSONAL,
      },
    });

    // Link provider to personal org
    await prisma.organizationMember.create({
      data: {
        userId: testData.providerUser.id,
        orgId: testData.providerPersonalOrg.id,
        role: OrgRole.OWNER,
      },
    });

    // Create AGENT user (for customer access tests)
    testData.agentUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-agent@example.com`,
        name: 'Agent User',
        password: 'hashed_password',
        accountType: UserAccountType.AGENT,
      },
    });

    // Create personal org for agent
    testData.agentPersonalOrg = await prisma.organization.create({
      data: {
        id: `${TEST_PREFIX}-agent-personal`,
        name: 'Agent Personal Org',
        type: OrgType.PERSONAL,
      },
    });

    // Link agent to personal org
    await prisma.organizationMember.create({
      data: {
        userId: testData.agentUser.id,
        orgId: testData.agentPersonalOrg.id,
        role: OrgRole.OWNER,
      },
    });

    // Create company org (agent is NOT a member)
    testData.companyOrg = await prisma.organization.create({
      data: {
        id: `${TEST_PREFIX}-company`,
        name: 'Company Org',
        type: OrgType.COMPANY,
      },
    });

    // Provider IS a member of company org
    await prisma.organizationMember.create({
      data: {
        userId: testData.providerUser.id,
        orgId: testData.companyOrg.id,
        role: OrgRole.OWNER,
      },
    });

    // Create customer record in company org linked to agent user
    testData.customerRecord = await prisma.organizationCustomer.create({
      data: {
        orgId: testData.companyOrg.id,
        name: 'Agent As Customer',
        email: testData.agentUser.email,
        userId: testData.agentUser.id,
      },
    });

    // Create project in company org assigned to agent-as-customer
    testData.projectInCompany = await prisma.project.create({
      data: {
        orgId: testData.companyOrg.id,
        customerId: testData.customerRecord.id,
        addressLine1: '123 Test Street',
        city: 'Test City',
        region: 'TC',
        postalCode: '12345',
        countryCode: 'US',
        status: 'PENDING',
      },
    });

    // Generate auth tokens
    testData.tokens.provider = jwtService.sign({
      sub: testData.providerUser.id,
      email: testData.providerUser.email,
    });

    testData.tokens.agent = jwtService.sign({
      sub: testData.agentUser.id,
      email: testData.agentUser.email,
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    await prisma.project.deleteMany({
      where: { id: testData.projectInCompany?.id },
    });
    await prisma.organizationCustomer.deleteMany({
      where: { id: testData.customerRecord?.id },
    });
    await prisma.organizationMember.deleteMany({
      where: {
        orgId: {
          in: [
            testData.providerPersonalOrg?.id,
            testData.agentPersonalOrg?.id,
            testData.companyOrg?.id,
          ].filter(Boolean),
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        id: {
          in: [
            testData.providerPersonalOrg?.id,
            testData.agentPersonalOrg?.id,
            testData.companyOrg?.id,
          ].filter(Boolean),
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testData.providerUser?.id, testData.agentUser?.id].filter(Boolean),
        },
      },
    });

    await app.close();
  });

  describe('User with only personal org and no projects', () => {
    it('should return 200 with empty array for provider in personal org', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${testData.tokens.provider}`)
        .set('x-org-id', testData.providerPersonalOrg.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual([]);
    });

    it('should return 200 with empty array for agent in personal org with no customer records', async () => {
      // Create a fresh agent with no customer records
      const freshAgent = await prisma.user.create({
        data: {
          email: `${TEST_PREFIX}-fresh-agent@example.com`,
          name: 'Fresh Agent',
          password: 'hashed',
          accountType: UserAccountType.AGENT,
        },
      });

      const freshAgentPersonalOrg = await prisma.organization.create({
        data: {
          id: `${TEST_PREFIX}-fresh-agent-personal`,
          name: 'Fresh Agent Personal',
          type: OrgType.PERSONAL,
        },
      });

      await prisma.organizationMember.create({
        data: {
          userId: freshAgent.id,
          orgId: freshAgentPersonalOrg.id,
          role: OrgRole.OWNER,
        },
      });

      const freshToken = jwtService.sign({
        sub: freshAgent.id,
        email: freshAgent.email,
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/projects/mine')
          .set('Authorization', `Bearer ${freshToken}`)
          .set('x-org-id', freshAgentPersonalOrg.id)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toEqual([]);
      } finally {
        // Cleanup
        await prisma.organizationMember.deleteMany({ where: { userId: freshAgent.id } });
        await prisma.organization.delete({ where: { id: freshAgentPersonalOrg.id } });
        await prisma.user.delete({ where: { id: freshAgent.id } });
      }
    });
  });

  describe('User with company org membership and no projects', () => {
    it('should return 200 with empty array for owner in company org with no projects', async () => {
      // Create a company org with no projects
      const emptyCompanyOrg = await prisma.organization.create({
        data: {
          id: `${TEST_PREFIX}-empty-company`,
          name: 'Empty Company',
          type: OrgType.COMPANY,
        },
      });

      await prisma.organizationMember.create({
        data: {
          userId: testData.providerUser.id,
          orgId: emptyCompanyOrg.id,
          role: OrgRole.OWNER,
        },
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/projects/mine')
          .set('Authorization', `Bearer ${testData.tokens.provider}`)
          .set('x-org-id', emptyCompanyOrg.id)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toEqual([]);
      } finally {
        await prisma.organizationMember.deleteMany({ where: { orgId: emptyCompanyOrg.id } });
        await prisma.organization.delete({ where: { id: emptyCompanyOrg.id } });
      }
    });
  });

  describe('Agent with customer access to project in another org', () => {
    it('should return customer-assigned projects when agent queries personal org', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${testData.tokens.agent}`)
        .set('x-org-id', testData.agentPersonalOrg.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      // Should include the project from company org
      const foundProject = response.body.find(
        (p: any) => p.id === testData.projectInCompany.id,
      );
      expect(foundProject).toBeDefined();
      expect(foundProject.orgId).toBe(testData.companyOrg.id);
    });

    it('should return customer-assigned projects when agent accesses company org directly', async () => {
      // Agent accessing company org where they're a customer but not a member
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${testData.tokens.agent}`)
        .set('x-org-id', testData.companyOrg.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Should only see projects where they're the customer in this org
      const foundProject = response.body.find(
        (p: any) => p.id === testData.projectInCompany.id,
      );
      expect(foundProject).toBeDefined();
    });
  });

  describe('Invalid org header', () => {
    it('should return 404 for non-existent org ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${testData.tokens.provider}`)
        .set('x-org-id', 'non-existent-org-id-12345')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should use personal org fallback when no x-org-id header', async () => {
      // Without x-org-id, should fall back to personal org
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${testData.tokens.provider}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should work (returns results from personal org context)
    });
  });

  describe('Missing membership in non-personal org', () => {
    it('should return 403 for provider accessing org they are not member of', async () => {
      // Create another company org where provider is NOT a member
      const otherCompanyOrg = await prisma.organization.create({
        data: {
          id: `${TEST_PREFIX}-other-company`,
          name: 'Other Company',
          type: OrgType.COMPANY,
        },
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/projects/mine')
          .set('Authorization', `Bearer ${testData.tokens.provider}`)
          .set('x-org-id', otherCompanyOrg.id)
          .expect(403);

        expect(response.body.message).toMatch(/not.*(member|belong|access)/i);
      } finally {
        await prisma.organization.delete({ where: { id: otherCompanyOrg.id } });
      }
    });

    it('should return 200 empty array for agent accessing org with no customer records', async () => {
      // Create company org where agent has no customer records
      const noCustomerOrg = await prisma.organization.create({
        data: {
          id: `${TEST_PREFIX}-no-customer-org`,
          name: 'No Customer Org',
          type: OrgType.COMPANY,
        },
      });

      try {
        // Agent should get empty array, not 403 (they might have projects later)
        const response = await request(app.getHttpServer())
          .get('/projects/mine')
          .set('Authorization', `Bearer ${testData.tokens.agent}`)
          .set('x-org-id', noCustomerOrg.id)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toEqual([]);
      } finally {
        await prisma.organization.delete({ where: { id: noCustomerOrg.id } });
      }
    });
  });

  describe('Authentication', () => {
    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer())
        .get('/projects/mine')
        .set('x-org-id', testData.companyOrg.id)
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', 'Bearer invalid-token-12345')
        .set('x-org-id', testData.companyOrg.id)
        .expect(401);
    });
  });
});
