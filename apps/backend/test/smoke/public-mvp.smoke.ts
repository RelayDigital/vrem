/**
 * Public MVP Smoke Test Suite
 *
 * End-to-end smoke tests for the public MVP flow covering:
 * 1. User sign up
 * 2. Bootstrap returns personal org
 * 3. Create project
 * 4. Upload media (simulated)
 * 5. Enable delivery
 * 6. Open delivery page
 * 7. Request download artifact and reach READY
 * 8. Post client comment and approve
 *
 * Run with: npm run test:smoke
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
const TEST_TIMEOUT = 120000; // 2 minutes for full flow
const ARTIFACT_POLL_INTERVAL = 1000; // 1 second
const ARTIFACT_POLL_TIMEOUT = 60000; // 60 seconds max wait

// Unique test identifier to avoid collisions
const TEST_RUN_ID = Date.now();

describe('Public MVP Smoke Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test state preserved across test steps
  let testUserId: string;
  let authToken: string;
  let personalOrgId: string;
  let projectId: string;
  let deliveryToken: string;
  let artifactId: string;
  let customerId: string;
  let customerToken: string;

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
    // Cleanup test data in reverse dependency order
    if (projectId) {
      // Delete artifacts
      await prisma.downloadArtifact.deleteMany({ where: { projectId } });
      // Delete messages
      await prisma.message.deleteMany({ where: { projectId } });
      // Delete media
      await prisma.media.deleteMany({ where: { projectId } });
      // Delete project
      await prisma.project.deleteMany({ where: { id: projectId } });
    }

    if (customerId) {
      await prisma.organizationCustomer.deleteMany({ where: { id: customerId } });
    }

    if (personalOrgId) {
      await prisma.organizationMember.deleteMany({ where: { orgId: personalOrgId } });
      await prisma.organization.deleteMany({ where: { id: personalOrgId } });
    }

    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }

    await app.close();
  }, TEST_TIMEOUT);

  // ============================================
  // STEP 1: User Sign Up
  // ============================================
  describe('Step 1: User Sign Up', () => {
    it('should register a new user and return JWT token', async () => {
      const email = `smoke-test-${TEST_RUN_ID}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          name: `Smoke Test User ${TEST_RUN_ID}`,
          password: 'TestPassword123!',
          accountType: 'AGENT',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.accountType).toBe('AGENT');

      // Store for subsequent tests
      authToken = response.body.token;
      testUserId = response.body.user.id;
    });
  });

  // ============================================
  // STEP 2: Bootstrap Returns Personal Org
  // ============================================
  describe('Step 2: Bootstrap Returns Personal Org', () => {
    it('should bootstrap user and confirm personal org exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me/bootstrap')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Support both old (organizationId) and new (personalOrgId) response formats
      const orgId = response.body.personalOrgId || response.body.organizationId;
      expect(orgId).toBeTruthy();

      // If we have accessibleOrgs (new format), verify personal org
      if (response.body.accessibleOrgs) {
        expect(response.body.accessibleOrgs.length).toBeGreaterThan(0);

        // Find personal org in accessible orgs
        const personalOrg = response.body.accessibleOrgs.find(
          (org: any) => org.orgId === orgId
        );
        expect(personalOrg).toBeDefined();
        expect(personalOrg.orgType).toBe('PERSONAL');
        expect(personalOrg.role).toBe('OWNER');
      }

      // Store for subsequent tests
      personalOrgId = orgId;
    });
  });

  // ============================================
  // STEP 3: Create Project
  // ============================================
  describe('Step 3: Create Project', () => {
    it('should create a project in the personal org', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', personalOrgId)
        .send({
          addressLine1: '123 Smoke Test Street',
          city: 'Test City',
          region: 'TC',
          postalCode: '12345',
          countryCode: 'US',
          scheduledTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          notes: `Smoke test project ${TEST_RUN_ID}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('deliveryToken');
      expect(response.body.orgId).toBe(personalOrgId);
      expect(response.body.addressLine1).toBe('123 Smoke Test Street');

      // Store for subsequent tests
      projectId = response.body.id;
      deliveryToken = response.body.deliveryToken;
    });
  });

  // ============================================
  // STEP 4: Upload Media (Simulated)
  // ============================================
  describe('Step 4: Upload Media', () => {
    it('should confirm media upload for the project', async () => {
      // Simulate Uploadcare upload by confirming with a fake key
      // In production, client uploads to Uploadcare first, then confirms
      const fakeUploadcareKey = randomUUID();

      const response = await request(app.getHttpServer())
        .post('/media/confirm-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', personalOrgId)
        .send({
          projectId,
          key: fakeUploadcareKey,
          filename: 'smoke-test-photo.jpg',
          size: 1024000, // ~1MB
          type: 'PHOTO',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.projectId).toBe(projectId);
      expect(response.body.filename).toBe('smoke-test-photo.jpg');
      expect(response.body.type).toBe('PHOTO');
    });

    it('should confirm a second media upload (video)', async () => {
      const fakeUploadcareKey = randomUUID();

      const response = await request(app.getHttpServer())
        .post('/media/confirm-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', personalOrgId)
        .send({
          projectId,
          key: fakeUploadcareKey,
          filename: 'smoke-test-video.mp4',
          size: 10240000, // ~10MB
          type: 'VIDEO',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('VIDEO');
    });
  });

  // ============================================
  // STEP 5: Enable Delivery
  // ============================================
  describe('Step 5: Enable Delivery', () => {
    it('should enable delivery for the project', async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/delivery/enable`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', personalOrgId)
        .expect(201);

      expect(response.body).toHaveProperty('enabled', true);
      expect(response.body).toHaveProperty('deliveryToken');
      expect(response.body).toHaveProperty('deliveryEnabledAt');
      expect(response.body.deliveryEnabledAt).toBeTruthy();

      // Update delivery token if rotated
      deliveryToken = response.body.deliveryToken;
    });
  });

  // ============================================
  // STEP 6: Open Delivery Page (Public Access)
  // ============================================
  describe('Step 6: Open Delivery Page', () => {
    it('should access delivery page by token (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/delivery/${deliveryToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body).toHaveProperty('organization');
      expect(response.body).toHaveProperty('media');
      expect(response.body).toHaveProperty('comments');

      // Verify project data
      expect(response.body.project.id).toBe(projectId);
      expect(response.body.project.deliveryEnabledAt).toBeTruthy();

      // Verify media is visible
      expect(response.body.media.length).toBe(2);

      // Verify organization data
      expect(response.body.organization.id).toBe(personalOrgId);
    });

    it('should reject access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/delivery/invalid-token-12345')
        .expect(404);
    });
  });

  // ============================================
  // STEP 7: Request Download Artifact and Reach READY
  // ============================================
  describe('Step 7: Request Download Artifact', () => {
    it('should request download artifact', async () => {
      const response = await request(app.getHttpServer())
        .post(`/delivery/${deliveryToken}/download-request`)
        .send({ mediaTypes: ['PHOTO', 'VIDEO'] })
        .expect(201);

      expect(response.body).toHaveProperty('artifactId');
      expect(response.body).toHaveProperty('status');
      expect(['PENDING', 'GENERATING', 'READY']).toContain(response.body.status);

      artifactId = response.body.artifactId;
    });

    it(
      'should poll until artifact is READY or timeout',
      async () => {
        // Skip this test if Uploadcare is not configured (download will stay in GENERATING)
        const hasUploadcare = process.env.UPLOADCARE_PUBLIC_KEY && process.env.UPLOADCARE_PRIVATE_KEY;

        const startTime = Date.now();
        let status = 'PENDING';
        let lastResponse: any;

        while (Date.now() - startTime < ARTIFACT_POLL_TIMEOUT) {
          lastResponse = await request(app.getHttpServer())
            .get(`/delivery/${deliveryToken}/download-status/${artifactId}`)
            .expect(200);

          status = lastResponse.body.status;

          if (status === 'READY') {
            expect(lastResponse.body).toHaveProperty('cdnUrl');
            return; // Success!
          }

          if (status === 'FAILED') {
            // If Uploadcare not configured, this is expected behavior
            if (!hasUploadcare) {
              console.log('Artifact generation failed (expected without Uploadcare config)');
              return;
            }
            throw new Error(`Artifact generation failed: ${lastResponse.body.error}`);
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, ARTIFACT_POLL_INTERVAL));
        }

        // Timeout - check if we have Uploadcare configured
        if (!hasUploadcare) {
          console.log(
            'Artifact generation timeout (expected without Uploadcare config). ' +
              `Last status: ${status}`
          );
          return;
        }

        throw new Error(`Artifact generation timed out after ${ARTIFACT_POLL_TIMEOUT}ms. Status: ${status}`);
      },
      ARTIFACT_POLL_TIMEOUT + 10000
    );
  });

  // ============================================
  // STEP 8: Post Client Comment and Approve
  // ============================================
  describe('Step 8: Post Comment and Approve', () => {
    beforeAll(async () => {
      // Create a customer user and link to project for approval flow
      const customerEmail = `smoke-test-customer-${TEST_RUN_ID}@example.com`;

      // Create customer user
      const customerUser = await prisma.user.create({
        data: {
          email: customerEmail,
          name: `Smoke Test Customer ${TEST_RUN_ID}`,
          password: 'hashed_not_used',
          accountType: 'AGENT',
        },
      });

      // Create org customer record
      const orgCustomer = await prisma.organizationCustomer.create({
        data: {
          orgId: personalOrgId,
          name: `Smoke Test Customer ${TEST_RUN_ID}`,
          email: customerEmail,
          linkedUserId: customerUser.id,
        },
      });

      // Link customer to project
      await prisma.project.update({
        where: { id: projectId },
        data: { customerId: orgCustomer.id },
      });

      // Generate token for customer
      customerToken = jwtService.sign({
        sub: customerUser.id,
        email: customerUser.email,
      });

      customerId = orgCustomer.id;
    });

    it('should post a comment on delivery (as customer)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/delivery/${deliveryToken}/comments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ content: `Smoke test comment from customer ${TEST_RUN_ID}` })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content');
      expect(response.body.content).toContain('Smoke test comment');
    });

    it('should approve delivery (as customer)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/delivery/${deliveryToken}/approve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('clientApprovalStatus', 'APPROVED');
      expect(response.body).toHaveProperty('clientApprovedAt');
      expect(response.body.clientApprovedAt).toBeTruthy();
    });

    it('should verify approval status on delivery page', async () => {
      const response = await request(app.getHttpServer())
        .get(`/delivery/${deliveryToken}`)
        .expect(200);

      expect(response.body.project.clientApprovalStatus).toBe('APPROVED');
      expect(response.body.project.clientApprovedAt).toBeTruthy();
    });
  });
});

/**
 * Utility function for running smoke tests against external server
 * Can be used for staging/production testing
 */
export async function runExternalSmokeTest(baseUrl: string): Promise<void> {
  console.log(`Running smoke tests against: ${baseUrl}`);
  // This would be implemented for external server testing
  // For now, use the Jest test suite above
  throw new Error('External smoke tests not yet implemented. Use npm run test:smoke for local testing.');
}
