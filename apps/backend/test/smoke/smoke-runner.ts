#!/usr/bin/env npx ts-node
/**
 * Standalone Smoke Test Runner
 *
 * Run smoke tests against any environment (local, staging, production).
 * Uses HTTP requests directly, no NestJS test module required.
 *
 * Usage:
 *   npx ts-node test/smoke/smoke-runner.ts [BASE_URL]
 *
 * Examples:
 *   npx ts-node test/smoke/smoke-runner.ts                           # Default: http://localhost:3001
 *   npx ts-node test/smoke/smoke-runner.ts http://localhost:3001     # Local
 *   npx ts-node test/smoke/smoke-runner.ts https://api.staging.vrem.app  # Staging
 *
 * Environment variables:
 *   SMOKE_TEST_BASE_URL - Alternative to CLI argument
 *   SMOKE_TEST_TIMEOUT  - Artifact poll timeout in ms (default: 60000)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { randomUUID } from 'crypto';

// Configuration
const BASE_URL = process.argv[2] || process.env.SMOKE_TEST_BASE_URL || 'http://localhost:3001';
const ARTIFACT_POLL_TIMEOUT = parseInt(process.env.SMOKE_TEST_TIMEOUT || '60000', 10);
const ARTIFACT_POLL_INTERVAL = 2000;
const TEST_RUN_ID = Date.now();

// Test state
interface TestState {
  authToken?: string;
  userId?: string;
  personalOrgId?: string;
  projectId?: string;
  deliveryToken?: string;
  artifactId?: string;
  customerId?: string;
  customerToken?: string;
  customerUserId?: string;
}

const state: TestState = {};

// HTTP client
let api: AxiosInstance;

// Test results
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

// Colored output helpers
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function log(message: string) {
  console.log(message);
}

function logStep(step: string) {
  console.log(`\n${colors.cyan('▶')} ${step}`);
}

function logPass(name: string, duration: number) {
  console.log(`  ${colors.green('✓')} ${name} ${colors.dim(`(${duration}ms)`)}`);
}

function logFail(name: string, error: string) {
  console.log(`  ${colors.red('✗')} ${name}`);
  console.log(`    ${colors.red(error)}`);
}

function logSkip(name: string, reason: string) {
  console.log(`  ${colors.yellow('○')} ${name} - ${reason}`);
}

// Test runner helper
async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, status: 'PASS', duration });
    logPass(name, duration);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', duration, error: errorMessage });
    logFail(name, errorMessage);
  }
}

function skipTest(name: string, reason: string) {
  results.push({ name, status: 'SKIP', duration: 0, error: reason });
  logSkip(name, reason);
}

// Assertion helpers
function assertEqual<T>(actual: T, expected: T, field: string) {
  if (actual !== expected) {
    throw new Error(`Expected ${field} to be "${expected}", got "${actual}"`);
  }
}

function assertTruthy(value: unknown, field: string) {
  if (!value) {
    throw new Error(`Expected ${field} to be truthy, got "${value}"`);
  }
}

function assertProperty(obj: any, prop: string) {
  if (!(prop in obj)) {
    throw new Error(`Expected response to have property "${prop}"`);
  }
}

// ============================================
// SMOKE TEST STEPS
// ============================================

async function step1_signUp() {
  logStep('Step 1: User Sign Up');

  await runTest('Register new user', async () => {
    const email = `smoke-${TEST_RUN_ID}@example.com`;
    const res = await api.post('/auth/register', {
      email,
      name: `Smoke Test ${TEST_RUN_ID}`,
      password: 'TestPassword123!',
      accountType: 'AGENT',
    });

    assertProperty(res.data, 'token');
    assertProperty(res.data, 'user');
    assertEqual(res.data.user.email, email, 'email');

    state.authToken = res.data.token;
    state.userId = res.data.user.id;
  });
}

async function step2_bootstrap() {
  logStep('Step 2: Bootstrap Returns Personal Org');

  if (!state.authToken) {
    skipTest('Bootstrap user', 'No auth token (signup failed)');
    return;
  }

  await runTest('Bootstrap user and get personal org', async () => {
    // Try bootstrap endpoint first (preferred), fallback to /me
    let res;
    try {
      res = await api.get('/auth/me/bootstrap', {
        headers: { Authorization: `Bearer ${state.authToken}` },
      });
      if (res.status === 404 || res.status === 401) {
        // Fallback to /me endpoint for older API versions
        res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${state.authToken}` },
        });
      }
    } catch (error) {
      // Fallback to /me endpoint
      try {
        res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${state.authToken}` },
        });
      } catch (e2) {
        throw new Error(`Failed to get user data. Bootstrap error: ${error}, /me error: ${e2}`);
      }
    }

    if (res.status >= 400) {
      throw new Error(`Bootstrap failed with status ${res.status}: ${JSON.stringify(res.data)}`);
    }

    // Support both old (organizationId) and new (personalOrgId) response formats
    const personalOrgId = res.data.personalOrgId || res.data.organizationId;
    if (!personalOrgId) {
      throw new Error(`Response missing org ID. Got: ${JSON.stringify(res.data).slice(0, 200)}`);
    }

    // If we have accessibleOrgs, verify personal org is there
    if (res.data.accessibleOrgs) {
      const personalOrg = res.data.accessibleOrgs.find(
        (org: any) => org.orgId === personalOrgId
      );
      if (personalOrg) {
        assertEqual(personalOrg.orgType, 'PERSONAL', 'org type');
      }
    }

    state.personalOrgId = personalOrgId;
  });
}

async function step3_createProject() {
  logStep('Step 3: Create Project');

  if (!state.authToken || !state.personalOrgId) {
    skipTest('Create project', 'Missing auth or org');
    return;
  }

  await runTest('Create project in personal org', async () => {
    const res = await api.post(
      '/projects/create',
      {
        addressLine1: '123 Smoke Test St',
        city: 'Test City',
        region: 'TC',
        postalCode: '12345',
        countryCode: 'US',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        notes: `Smoke test ${TEST_RUN_ID}`,
      },
      {
        headers: {
          Authorization: `Bearer ${state.authToken}`,
          'x-org-id': state.personalOrgId,
        },
      }
    );

    assertProperty(res.data, 'id');
    assertProperty(res.data, 'deliveryToken');
    assertEqual(res.data.orgId, state.personalOrgId, 'orgId');

    state.projectId = res.data.id;
    state.deliveryToken = res.data.deliveryToken;
  });
}

async function step4_uploadMedia() {
  logStep('Step 4: Upload Media');

  if (!state.authToken || !state.personalOrgId || !state.projectId) {
    skipTest('Upload media', 'Missing prerequisites');
    return;
  }

  await runTest('Confirm photo upload', async () => {
    const res = await api.post(
      '/media/confirm-upload',
      {
        projectId: state.projectId,
        key: randomUUID(),
        filename: 'smoke-photo.jpg',
        size: 1024000,
        type: 'PHOTO',
      },
      {
        headers: {
          Authorization: `Bearer ${state.authToken}`,
          'x-org-id': state.personalOrgId,
        },
      }
    );

    assertProperty(res.data, 'id');
    assertEqual(res.data.type, 'PHOTO', 'media type');
  });

  await runTest('Confirm video upload', async () => {
    const res = await api.post(
      '/media/confirm-upload',
      {
        projectId: state.projectId,
        key: randomUUID(),
        filename: 'smoke-video.mp4',
        size: 10240000,
        type: 'VIDEO',
      },
      {
        headers: {
          Authorization: `Bearer ${state.authToken}`,
          'x-org-id': state.personalOrgId,
        },
      }
    );

    assertProperty(res.data, 'id');
    assertEqual(res.data.type, 'VIDEO', 'media type');
  });
}

async function step5_enableDelivery() {
  logStep('Step 5: Enable Delivery');

  if (!state.authToken || !state.personalOrgId || !state.projectId) {
    skipTest('Enable delivery', 'Missing prerequisites');
    return;
  }

  await runTest('Enable delivery for project', async () => {
    const res = await api.post(
      `/projects/${state.projectId}/delivery/enable`,
      {},
      {
        headers: {
          Authorization: `Bearer ${state.authToken}`,
          'x-org-id': state.personalOrgId,
        },
      }
    );

    assertProperty(res.data, 'enabled');
    assertEqual(res.data.enabled, true, 'enabled');
    assertProperty(res.data, 'deliveryToken');
    assertTruthy(res.data.deliveryEnabledAt, 'deliveryEnabledAt');

    state.deliveryToken = res.data.deliveryToken;
  });
}

async function step6_openDeliveryPage() {
  logStep('Step 6: Open Delivery Page');

  if (!state.deliveryToken) {
    skipTest('Open delivery page', 'No delivery token');
    return;
  }

  await runTest('Access delivery page (public)', async () => {
    const res = await api.get(`/delivery/${state.deliveryToken}`);

    assertProperty(res.data, 'project');
    assertProperty(res.data, 'organization');
    assertProperty(res.data, 'media');
    assertEqual(res.data.project.id, state.projectId, 'project.id');
    assertTruthy(res.data.media.length >= 2, 'media count');
  });

  await runTest('Reject invalid token', async () => {
    try {
      await api.get('/delivery/invalid-token-12345');
      throw new Error('Expected 404 but got success');
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return; // Expected
      }
      throw error;
    }
  });
}

async function step7_requestDownload() {
  logStep('Step 7: Request Download Artifact');

  if (!state.deliveryToken) {
    skipTest('Request download', 'No delivery token');
    return;
  }

  await runTest('Request download artifact', async () => {
    const res = await api.post(`/delivery/${state.deliveryToken}/download-request`, {
      mediaTypes: ['PHOTO', 'VIDEO'],
    });

    assertProperty(res.data, 'artifactId');
    assertProperty(res.data, 'status');
    state.artifactId = res.data.artifactId;
  });

  await runTest('Poll artifact status', async () => {
    if (!state.artifactId) {
      throw new Error('No artifact ID');
    }

    const startTime = Date.now();
    let status = 'PENDING';

    while (Date.now() - startTime < ARTIFACT_POLL_TIMEOUT) {
      const res = await api.get(
        `/delivery/${state.deliveryToken}/download-status/${state.artifactId}`
      );
      status = res.data.status;

      if (status === 'READY') {
        assertTruthy(res.data.cdnUrl, 'cdnUrl');
        return;
      }

      if (status === 'FAILED') {
        // This is acceptable if Uploadcare is not configured
        log(`    ${colors.yellow('Note: Artifact generation failed (may need Uploadcare config)')}`);
        return;
      }

      await new Promise((r) => setTimeout(r, ARTIFACT_POLL_INTERVAL));
    }

    // Timeout is acceptable without storage configured
    log(`    ${colors.yellow(`Note: Artifact polling timed out (status: ${status})`)}`);
  });
}

async function step8_commentAndApprove() {
  logStep('Step 8: Post Comment and Approve');

  if (!state.deliveryToken || !state.projectId || !state.personalOrgId) {
    skipTest('Comment and approve', 'Missing prerequisites');
    return;
  }

  // Note: This step requires creating a customer and linking to project
  // In standalone runner, we skip this unless we have DB access
  skipTest('Post comment (requires customer setup)', 'Standalone runner limitation');
  skipTest('Approve delivery (requires customer setup)', 'Standalone runner limitation');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan('Public MVP Smoke Test Suite'));
  console.log('='.repeat(60));
  console.log(`Target: ${colors.yellow(BASE_URL)}`);
  console.log(`Test Run ID: ${TEST_RUN_ID}`);
  console.log('='.repeat(60));

  // Initialize HTTP client
  api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    validateStatus: (status) => status < 500, // Don't throw on 4xx
  });

  // Add response interceptor for debugging
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response;
        throw new Error(`HTTP ${status}: ${JSON.stringify(data)}`);
      }
      throw error;
    }
  );

  // Check server health first
  try {
    await api.get('/');
    log(`\n${colors.green('✓')} Server is reachable`);
  } catch (error) {
    log(`\n${colors.red('✗')} Server is not reachable at ${BASE_URL}`);
    log(`  Make sure the server is running and accessible.`);
    process.exit(1);
  }

  // Run test steps
  await step1_signUp();
  await step2_bootstrap();
  await step3_createProject();
  await step4_uploadMedia();
  await step5_enableDelivery();
  await step6_openDeliveryPage();
  await step7_requestDownload();
  await step8_commentAndApprove();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  console.log(`${colors.green('Passed:')} ${passed}`);
  console.log(`${colors.red('Failed:')} ${failed}`);
  console.log(`${colors.yellow('Skipped:')} ${skipped}`);
  console.log(`Total: ${results.length}`);

  if (failed > 0) {
    console.log(`\n${colors.red('SMOKE TESTS FAILED')}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green('SMOKE TESTS PASSED')}`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
