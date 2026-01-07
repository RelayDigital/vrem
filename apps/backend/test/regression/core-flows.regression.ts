/**
 * Core Flows Regression Test Suite
 *
 * Automated regression harness that validates critical user flows:
 * 1. Create user (register)
 * 2. Ensure personal org exists
 * 3. Create org (team/company)
 * 4. Invite membership
 * 5. Create project
 * 6. Fetch dashboard
 * 7. Fetch projects/mine
 * 8. Fetch delivery page
 *
 * FAIL CONDITIONS:
 * - Any endpoint returns 500
 * - Auth/org-context behavior is inconsistent
 * - Personal org not created atomically with user
 * - Org-context missing expected fields
 *
 * Run with: npm run test:regression
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

// Test configuration
const TEST_TIMEOUT = 120000; // 2 minutes
const TEST_RUN_ID = `reg-${Date.now()}`;

describe('Core Flows Regression Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test state preserved across tests
  const state = {
    // Primary user (PROVIDER)
    providerUserId: '',
    providerToken: '',
    providerPersonalOrgId: '',
    // Secondary user (AGENT) for invite testing
    agentUserId: '',
    agentToken: '',
    agentPersonalOrgId: '',
    // Company org created by provider
    companyOrgId: '',
    // Invite token
    inviteToken: '',
    // Project
    projectId: '',
    deliveryToken: '',
  };

  // Track entities for cleanup
  const cleanup = {
    userIds: [] as string[],
    orgIds: [] as string[],
    projectIds: [] as string[],
    inviteIds: [] as string[],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup in reverse dependency order
    for (const projectId of cleanup.projectIds) {
      await prisma.downloadArtifact.deleteMany({ where: { projectId } }).catch(() => {});
      await prisma.message.deleteMany({ where: { projectId } }).catch(() => {});
      await prisma.media.deleteMany({ where: { projectId } }).catch(() => {});
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {});
    }

    for (const inviteId of cleanup.inviteIds) {
      await prisma.invitation.deleteMany({ where: { id: inviteId } }).catch(() => {});
    }

    for (const orgId of cleanup.orgIds) {
      await prisma.organizationCustomer.deleteMany({ where: { orgId } }).catch(() => {});
      await prisma.organizationMember.deleteMany({ where: { orgId } }).catch(() => {});
      await prisma.invitation.deleteMany({ where: { orgId } }).catch(() => {});
      await prisma.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
    }

    for (const userId of cleanup.userIds) {
      await prisma.tourProgress.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.tourStatus.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }

    await app.close();
  }, TEST_TIMEOUT);

  // ============================================
  // STEP 1: Create User (Register)
  // ============================================
  describe('Step 1: Create User', () => {
    it('should register a PROVIDER user and return token + user', async () => {
      const email = `${TEST_RUN_ID}-provider@example.com`;

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          name: `Provider ${TEST_RUN_ID}`,
          password: 'TestPassword123!',
          accountType: 'PROVIDER',
        })
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on register: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.accountType).toBe('PROVIDER');

      state.providerToken = response.body.token;
      state.providerUserId = response.body.user.id;
      cleanup.userIds.push(state.providerUserId);
    });

    it('should register an AGENT user for invite testing', async () => {
      const email = `${TEST_RUN_ID}-agent@example.com`;

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          name: `Agent ${TEST_RUN_ID}`,
          password: 'TestPassword123!',
          accountType: 'AGENT',
        })
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on register: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);

      state.agentToken = response.body.token;
      state.agentUserId = response.body.user.id;
      cleanup.userIds.push(state.agentUserId);
    });
  });

  // ============================================
  // STEP 2: Ensure Personal Org Exists
  // ============================================
  describe('Step 2: Ensure Personal Org Exists', () => {
    it('should have personal org created atomically with provider user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me/org-context')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on org-context: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      // Validate org-context response structure
      expect(response.body).toHaveProperty('personalOrg');
      expect(response.body).toHaveProperty('memberships');
      expect(response.body).toHaveProperty('customerOfOrgs');
      expect(response.body).toHaveProperty('accountType');

      // Validate personal org
      expect(response.body.personalOrg).toHaveProperty('id');
      expect(response.body.personalOrg).toHaveProperty('name');
      expect(response.body.personalOrg.type).toBe('PERSONAL');

      state.providerPersonalOrgId = response.body.personalOrg.id;
      cleanup.orgIds.push(state.providerPersonalOrgId);

      // Account type should match
      expect(response.body.accountType).toBe('PROVIDER');
    });

    it('should have personal org created atomically with agent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me/org-context')
        .set('Authorization', `Bearer ${state.agentToken}`)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on org-context: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(response.body.personalOrg).toHaveProperty('id');
      expect(response.body.personalOrg.type).toBe('PERSONAL');

      state.agentPersonalOrgId = response.body.personalOrg.id;
      cleanup.orgIds.push(state.agentPersonalOrgId);
    });

    it('should verify personal org exists in database with OWNER membership', async () => {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: state.providerUserId,
          orgId: state.providerPersonalOrgId,
        },
        include: { organization: true },
      });

      expect(membership).not.toBeNull();
      expect(membership!.role).toBe('OWNER');
      expect(membership!.organization.type).toBe('PERSONAL');
    });
  });

  // ============================================
  // STEP 3: Create Org (Team/Company)
  // ============================================
  describe('Step 3: Create Organization', () => {
    it('should create a COMPANY organization', async () => {
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.providerPersonalOrgId)
        .send({
          name: `Test Company ${TEST_RUN_ID}`,
          type: 'COMPANY',
        })
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on create org: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.type).toBe('COMPANY');

      state.companyOrgId = response.body.id;
      cleanup.orgIds.push(state.companyOrgId);
    });

    it('should show new org in org-context memberships', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me/org-context')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on org-context: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      // Should have the new company in memberships
      const companyMembership = response.body.memberships.find(
        (m: any) => m.orgId === state.companyOrgId
      );
      expect(companyMembership).toBeDefined();
      expect(companyMembership.role).toBe('OWNER');
      expect(companyMembership.organization.type).toBe('COMPANY');
    });
  });

  // ============================================
  // STEP 4: Invite Membership
  // ============================================
  describe('Step 4: Invite Membership', () => {
    it('should create an invitation to the company org', async () => {
      const inviteEmail = `${TEST_RUN_ID}-invite@example.com`;

      const response = await request(app.getHttpServer())
        .post(`/organizations/${state.companyOrgId}/invite`)
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.companyOrgId)
        .send({
          email: inviteEmail,
          role: 'TECHNICIAN',
        })
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on invite: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('token');
      expect(response.body.email).toBe(inviteEmail);
      expect(response.body.role).toBe('TECHNICIAN');

      state.inviteToken = response.body.token;
      cleanup.inviteIds.push(response.body.id);
    });

    it('should validate invite token publicly', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/invite/validate/${state.inviteToken}`)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on validate invite: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body).toHaveProperty('organization');
      expect(response.body.organization.id).toBe(state.companyOrgId);
    });

    it('should accept invite as agent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/organizations/accept-invite')
        .set('Authorization', `Bearer ${state.agentToken}`)
        .set('x-org-id', state.agentPersonalOrgId)
        .send({ token: state.inviteToken })
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on accept invite: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);

      expect(response.body).toHaveProperty('orgId');
      expect(response.body.orgId).toBe(state.companyOrgId);
    });

    it('should show company org in agent org-context after accepting', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me/org-context')
        .set('Authorization', `Bearer ${state.agentToken}`)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on org-context: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      const companyMembership = response.body.memberships.find(
        (m: any) => m.orgId === state.companyOrgId
      );
      expect(companyMembership).toBeDefined();
      expect(companyMembership.role).toBe('TECHNICIAN');
    });
  });

  // ============================================
  // STEP 5: Create Project
  // ============================================
  describe('Step 5: Create Project', () => {
    it('should create a project in personal org', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects/create')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.providerPersonalOrgId)
        .send({
          addressLine1: `${TEST_RUN_ID} Test Street`,
          city: 'Test City',
          region: 'TC',
          postalCode: '12345',
          countryCode: 'US',
          scheduledTime: new Date(Date.now() + 86400000).toISOString(),
          notes: `Regression test project ${TEST_RUN_ID}`,
        })
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on create project: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('deliveryToken');
      expect(response.body.orgId).toBe(state.providerPersonalOrgId);

      state.projectId = response.body.id;
      state.deliveryToken = response.body.deliveryToken;
      cleanup.projectIds.push(state.projectId);
    });

    it('should create a project in company org', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects/create')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.companyOrgId)
        .send({
          addressLine1: `${TEST_RUN_ID} Company Street`,
          city: 'Company City',
          region: 'CC',
          postalCode: '54321',
          countryCode: 'US',
        })
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on create project: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);

      expect(response.body.orgId).toBe(state.companyOrgId);
      cleanup.projectIds.push(response.body.id);
    });
  });

  // ============================================
  // STEP 6: Fetch Dashboard
  // ============================================
  describe('Step 6: Fetch Dashboard', () => {
    it('should fetch dashboard for personal org without 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.providerPersonalOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on dashboard: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      // Dashboard should return some structure (varies by implementation)
      expect(response.body).toBeDefined();
    });

    it('should fetch dashboard for company org without 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.companyOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on dashboard: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should fetch dashboard as technician in company org', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${state.agentToken}`)
        .set('x-org-id', state.companyOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on dashboard: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  // ============================================
  // STEP 7: Fetch Projects/Mine
  // ============================================
  describe('Step 7: Fetch Projects/Mine', () => {
    it('should fetch projects/mine for personal org without 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.providerPersonalOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on projects/mine: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should include the project we created
      const project = response.body.find((p: any) => p.id === state.projectId);
      expect(project).toBeDefined();
    });

    it('should fetch projects/mine for company org without 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.companyOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on projects/mine: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for user with no projects (not 500)', async () => {
      // Agent in their personal org has no projects
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${state.agentToken}`)
        .set('x-org-id', state.agentPersonalOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on projects/mine: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 for non-member accessing company org (not 500)', async () => {
      // Create a fresh user who is not a member of the company
      const freshEmail = `${TEST_RUN_ID}-fresh@example.com`;
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: freshEmail,
          name: 'Fresh User',
          password: 'TestPassword123!',
          accountType: 'PROVIDER',
        })
        .expect(201);

      const freshToken = regRes.body.token;
      cleanup.userIds.push(regRes.body.user.id);

      // Get their personal org
      const ctxRes = await request(app.getHttpServer())
        .get('/users/me/org-context')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);

      cleanup.orgIds.push(ctxRes.body.personalOrg.id);

      // Try to access company org they're not a member of
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${freshToken}`)
        .set('x-org-id', state.companyOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on projects/mine unauthorized: ${JSON.stringify(res.body)}`);
          }
        });

      // Should be 403, not 500
      expect(response.status).toBe(403);
    });
  });

  // ============================================
  // STEP 8: Fetch Delivery Page
  // ============================================
  describe('Step 8: Fetch Delivery Page', () => {
    beforeAll(async () => {
      // Enable delivery on the project first
      await request(app.getHttpServer())
        .post(`/projects/${state.projectId}/delivery/enable`)
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', state.providerPersonalOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on enable delivery: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(201);
    });

    it('should fetch delivery page by token without 500', async () => {
      const response = await request(app.getHttpServer())
        .get(`/delivery/${state.deliveryToken}`)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on delivery page: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body).toHaveProperty('organization');
      expect(response.body.project.id).toBe(state.projectId);
    });

    it('should return 404 for invalid delivery token (not 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/delivery/invalid-token-12345')
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on invalid delivery token: ${JSON.stringify(res.body)}`);
          }
        });

      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // Auth/Org-Context Consistency Checks
  // ============================================
  describe('Auth/Org-Context Consistency', () => {
    it('should return consistent data between bootstrap and org-context', async () => {
      // Get bootstrap data
      const bootstrapRes = await request(app.getHttpServer())
        .get('/auth/me/bootstrap')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on bootstrap: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      // Get org-context data
      const orgContextRes = await request(app.getHttpServer())
        .get('/users/me/org-context')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .expect(200);

      // Personal org IDs should match
      const bootstrapOrgId = bootstrapRes.body.personalOrgId || bootstrapRes.body.organizationId;
      expect(bootstrapOrgId).toBe(orgContextRes.body.personalOrg.id);
    });

    it('should reject request with invalid org header (404 not 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${state.providerToken}`)
        .set('x-org-id', 'nonexistent-org-id-12345')
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR on invalid org header: ${JSON.stringify(res.body)}`);
          }
        });

      expect(response.status).toBe(404);
    });

    it('should work without x-org-id header (falls back to personal org)', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('Authorization', `Bearer ${state.providerToken}`)
        // No x-org-id header
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR without org header: ${JSON.stringify(res.body)}`);
          }
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects/mine')
        .set('x-org-id', state.providerPersonalOrgId)
        .expect((res) => {
          if (res.status >= 500) {
            throw new Error(`500 ERROR without auth: ${JSON.stringify(res.body)}`);
          }
        });

      expect(response.status).toBe(401);
    });
  });
});
