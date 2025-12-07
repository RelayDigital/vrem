import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let testUser: any;
  let testOrg: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Create test user and organization
    testUser = await prisma.user.create({
      data: {
        email: `test-orders-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'hashed_password',
        accountType: 'AGENT',
      },
    });

    testOrg = await prisma.organization.create({
      data: {
        id: `test-org-${Date.now()}`,
        name: 'Test Organization',
        type: 'TEAM',
      },
    });

    // Create membership with OWNER role
    await prisma.organizationMember.create({
      data: {
        userId: testUser.id,
        orgId: testOrg.id,
        role: 'OWNER',
      },
    });

    // Generate auth token
    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.project.deleteMany({ where: { orgId: testOrg.id } });
    await prisma.organizationCustomer.deleteMany({ where: { orgId: testOrg.id } });
    await prisma.organizationMember.deleteMany({ where: { orgId: testOrg.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await app.close();
  });

  describe('POST /orders/create', () => {
    it('should create an order with new customer', async () => {
      const orderData = {
        newCustomer: {
          name: 'New Test Customer',
          email: 'customer@test.com',
          phone: '555-1234',
        },
        addressLine1: '123 Test Street',
        city: 'Test City',
        region: 'TC',
        postalCode: '12345',
        countryCode: 'US',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        mediaTypes: ['photo', 'video'],
        priority: 'standard',
        notes: 'Test order notes',
      };

      const response = await request(app.getHttpServer())
        .post('/orders/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('project');
      expect(response.body).toHaveProperty('customer');
      expect(response.body).toHaveProperty('isNewCustomer', true);
      expect(response.body.project.addressLine1).toBe('123 Test Street');
      expect(response.body.customer.name).toBe('New Test Customer');
    });

    it('should create an order with existing customer', async () => {
      // First create a customer
      const customer = await prisma.organizationCustomer.create({
        data: {
          orgId: testOrg.id,
          name: 'Existing Customer',
          email: 'existing@test.com',
        },
      });

      const orderData = {
        customerId: customer.id,
        addressLine1: '456 Another Street',
        city: 'Another City',
        scheduledTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        mediaTypes: ['photo'],
        priority: 'rush',
      };

      const response = await request(app.getHttpServer())
        .post('/orders/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('project');
      expect(response.body).toHaveProperty('isNewCustomer', false);
      expect(response.body.project.customerId).toBe(customer.id);
    });

    it('should reject order without customer', async () => {
      const orderData = {
        addressLine1: '789 No Customer Street',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        mediaTypes: ['photo'],
        priority: 'standard',
      };

      await request(app.getHttpServer())
        .post('/orders/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .send(orderData)
        .expect(400);
    });

    it('should reject order without media types', async () => {
      const orderData = {
        newCustomer: { name: 'Test Customer' },
        addressLine1: '789 No Media Street',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        mediaTypes: [],
        priority: 'standard',
      };

      await request(app.getHttpServer())
        .post('/orders/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .send(orderData)
        .expect(400);
    });

    it('should reject unauthorized user', async () => {
      const orderData = {
        newCustomer: { name: 'Test Customer' },
        addressLine1: '789 Unauthorized Street',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        mediaTypes: ['photo'],
        priority: 'standard',
      };

      await request(app.getHttpServer())
        .post('/orders/create')
        .set('x-org-id', testOrg.id)
        .send(orderData)
        .expect(401);
    });

    it('should detect scheduling conflicts', async () => {
      // Create a technician
      const technician = await prisma.user.create({
        data: {
          email: `tech-${Date.now()}@test.com`,
          name: 'Test Technician',
          password: 'hashed',
          accountType: 'PROVIDER',
        },
      });

      await prisma.organizationMember.create({
        data: {
          userId: technician.id,
          orgId: testOrg.id,
          role: 'TECHNICIAN',
        },
      });

      const scheduledTime = new Date(Date.now() + 259200000); // 3 days from now

      // Create first order
      const firstOrder = {
        newCustomer: { name: 'First Customer' },
        addressLine1: '100 First Street',
        scheduledTime: scheduledTime.toISOString(),
        mediaTypes: ['photo'],
        priority: 'standard',
        technicianId: technician.id,
      };

      await request(app.getHttpServer())
        .post('/orders/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .send(firstOrder)
        .expect(201);

      // Try to create conflicting order
      const conflictingOrder = {
        newCustomer: { name: 'Second Customer' },
        addressLine1: '200 Second Street',
        scheduledTime: scheduledTime.toISOString(),
        mediaTypes: ['photo'],
        priority: 'standard',
        technicianId: technician.id,
      };

      const response = await request(app.getHttpServer())
        .post('/orders/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .send(conflictingOrder)
        .expect(409);

      expect(response.body.message).toContain('conflict');

      // Cleanup technician
      await prisma.organizationMember.deleteMany({ where: { userId: technician.id } });
      await prisma.user.delete({ where: { id: technician.id } });
    });
  });

  describe('GET /orders', () => {
    it('should list orders for organization', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/orders')
        .set('x-org-id', testOrg.id)
        .expect(401);
    });
  });

  describe('GET /availability', () => {
    it('should return availability for date range', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 604800000).toISOString().split('T')[0]; // 1 week

      const response = await request(app.getHttpServer())
        .get('/availability')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject request without date range', async () => {
      await request(app.getHttpServer())
        .get('/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .expect(400);
    });
  });

  describe('GET /availability/check', () => {
    it('should check specific slot availability', async () => {
      // Create a technician
      const technician = await prisma.user.create({
        data: {
          email: `tech-check-${Date.now()}@test.com`,
          name: 'Check Technician',
          password: 'hashed',
          accountType: 'PROVIDER',
        },
      });

      await prisma.organizationMember.create({
        data: {
          userId: technician.id,
          orgId: testOrg.id,
          role: 'TECHNICIAN',
        },
      });

      const scheduledTime = new Date(Date.now() + 345600000).toISOString(); // 4 days

      const response = await request(app.getHttpServer())
        .get('/availability/check')
        .query({
          technicianId: technician.id,
          scheduledTime,
          duration: 60,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body).toHaveProperty('available');
      expect(typeof response.body.available).toBe('boolean');

      // Cleanup
      await prisma.organizationMember.deleteMany({ where: { userId: technician.id } });
      await prisma.user.delete({ where: { id: technician.id } });
    });
  });
});

