#!/usr/bin/env npx ts-node
/**
 * Standalone Regression Test Runner
 *
 * Runs core flow regression tests against any environment.
 * Uses HTTP requests directly, no NestJS test module required.
 *
 * Usage:
 *   npx ts-node test/regression/regression-runner.ts [BASE_URL]
 *
 * Examples:
 *   npx ts-node test/regression/regression-runner.ts                    # Default: http://localhost:3001
 *   npx ts-node test/regression/regression-runner.ts http://localhost:3001
 *   npx ts-node test/regression/regression-runner.ts https://api.staging.vrem.app
 *
 * Environment variables:
 *   REGRESSION_BASE_URL - Alternative to CLI argument
 *   REGRESSION_TIMEOUT  - Request timeout in ms (default: 30000)
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Configuration
const BASE_URL = process.argv[2] || process.env.REGRESSION_BASE_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT = parseInt(process.env.REGRESSION_TIMEOUT || '30000', 10);
const TEST_RUN_ID = `reg-runner-${Date.now()}`;

// Test state
interface TestState {
  providerToken?: string;
  providerUserId?: string;
  providerPersonalOrgId?: string;
  agentToken?: string;
  agentUserId?: string;
  agentPersonalOrgId?: string;
  companyOrgId?: string;
  inviteToken?: string;
  projectId?: string;
  deliveryToken?: string;
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

// Colored output
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function log(message: string) {
  console.log(message);
}

function logStep(step: string) {
  console.log(`\n${colors.cyan('▶')} ${colors.bold(step)}`);
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

// Test runner
async function runTest(name: string, fn: () => Promise<void>): Promise<boolean> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, status: 'PASS', duration });
    logPass(name, duration);
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', duration, error: errorMessage });
    logFail(name, errorMessage);
    return false;
  }
}

function skipTest(name: string, reason: string) {
  results.push({ name, status: 'SKIP', duration: 0, error: reason });
  logSkip(name, reason);
}

// Assertions
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

function assertNo500(response: any, context: string) {
  if (response.status >= 500) {
    throw new Error(`500 ERROR on ${context}: ${JSON.stringify(response.data)}`);
  }
}

// ============================================
// TEST STEPS
// ============================================

async function step1_createUsers() {
  logStep('Step 1: Create Users');

  await runTest('Register PROVIDER user', async () => {
    const email = `${TEST_RUN_ID}-provider@example.com`;
    const res = await api.post('/auth/register', {
      email,
      name: `Provider ${TEST_RUN_ID}`,
      password: 'TestPassword123!',
      accountType: 'PROVIDER',
    });

    assertNo500(res, 'register provider');
    assertEqual(res.status, 201, 'status');
    assertProperty(res.data, 'token');
    assertProperty(res.data, 'user');

    state.providerToken = res.data.token;
    state.providerUserId = res.data.user.id;
  });

  await runTest('Register AGENT user', async () => {
    const email = `${TEST_RUN_ID}-agent@example.com`;
    const res = await api.post('/auth/register', {
      email,
      name: `Agent ${TEST_RUN_ID}`,
      password: 'TestPassword123!',
      accountType: 'AGENT',
    });

    assertNo500(res, 'register agent');
    assertEqual(res.status, 201, 'status');

    state.agentToken = res.data.token;
    state.agentUserId = res.data.user.id;
  });
}

async function step2_ensurePersonalOrgs() {
  logStep('Step 2: Ensure Personal Org Exists');

  if (!state.providerToken || !state.agentToken) {
    skipTest('Get org-context', 'No auth tokens (step 1 failed)');
    return;
  }

  await runTest('Provider has personal org via org-context', async () => {
    const res = await api.get('/users/me/org-context', {
      headers: { Authorization: `Bearer ${state.providerToken}` },
    });

    assertNo500(res, 'org-context provider');
    assertEqual(res.status, 200, 'status');
    assertProperty(res.data, 'personalOrg');
    assertProperty(res.data, 'memberships');
    assertProperty(res.data.personalOrg, 'id');
    assertEqual(res.data.personalOrg.type, 'PERSONAL', 'personalOrg.type');
    assertEqual(res.data.accountType, 'PROVIDER', 'accountType');

    state.providerPersonalOrgId = res.data.personalOrg.id;
  });

  await runTest('Agent has personal org via org-context', async () => {
    const res = await api.get('/users/me/org-context', {
      headers: { Authorization: `Bearer ${state.agentToken}` },
    });

    assertNo500(res, 'org-context agent');
    assertEqual(res.data.personalOrg.type, 'PERSONAL', 'personalOrg.type');

    state.agentPersonalOrgId = res.data.personalOrg.id;
  });
}

async function step3_createOrganization() {
  logStep('Step 3: Create Organization');

  if (!state.providerToken || !state.providerPersonalOrgId) {
    skipTest('Create organization', 'Missing prerequisites');
    return;
  }

  await runTest('Create COMPANY organization', async () => {
    const res = await api.post(
      '/organizations',
      {
        name: `Test Company ${TEST_RUN_ID}`,
        type: 'COMPANY',
      },
      {
        headers: {
          Authorization: `Bearer ${state.providerToken}`,
          'x-org-id': state.providerPersonalOrgId,
        },
      }
    );

    assertNo500(res, 'create organization');
    assertEqual(res.status, 201, 'status');
    assertProperty(res.data, 'id');
    assertEqual(res.data.type, 'COMPANY', 'type');

    state.companyOrgId = res.data.id;
  });

  await runTest('Company appears in org-context', async () => {
    const res = await api.get('/users/me/org-context', {
      headers: { Authorization: `Bearer ${state.providerToken}` },
    });

    assertNo500(res, 'org-context after create');
    const membership = res.data.memberships.find((m: any) => m.orgId === state.companyOrgId);
    assertTruthy(membership, 'company membership exists');
    assertEqual(membership.role, 'OWNER', 'role');
  });
}

async function step4_inviteMembership() {
  logStep('Step 4: Invite Membership');

  if (!state.companyOrgId || !state.providerToken) {
    skipTest('Invite membership', 'Missing prerequisites');
    return;
  }

  await runTest('Create invitation', async () => {
    const res = await api.post(
      `/organizations/${state.companyOrgId}/invite`,
      {
        email: `${TEST_RUN_ID}-invite@example.com`,
        role: 'TECHNICIAN',
      },
      {
        headers: {
          Authorization: `Bearer ${state.providerToken}`,
          'x-org-id': state.companyOrgId,
        },
      }
    );

    assertNo500(res, 'create invite');
    assertEqual(res.status, 201, 'status');
    assertProperty(res.data, 'token');

    state.inviteToken = res.data.token;
  });

  await runTest('Validate invitation publicly', async () => {
    const res = await api.get(`/organizations/invite/validate/${state.inviteToken}`);

    assertNo500(res, 'validate invite');
    assertEqual(res.data.valid, true, 'valid');
    assertEqual(res.data.organization.id, state.companyOrgId, 'organization.id');
  });

  await runTest('Accept invitation as agent', async () => {
    const res = await api.post(
      '/organizations/accept-invite',
      { token: state.inviteToken },
      {
        headers: {
          Authorization: `Bearer ${state.agentToken}`,
          'x-org-id': state.agentPersonalOrgId,
        },
      }
    );

    assertNo500(res, 'accept invite');
    assertEqual(res.status, 201, 'status');
    assertEqual(res.data.orgId, state.companyOrgId, 'orgId');
  });

  await runTest('Agent sees company in org-context', async () => {
    const res = await api.get('/users/me/org-context', {
      headers: { Authorization: `Bearer ${state.agentToken}` },
    });

    assertNo500(res, 'agent org-context');
    const membership = res.data.memberships.find((m: any) => m.orgId === state.companyOrgId);
    assertTruthy(membership, 'company membership exists');
    assertEqual(membership.role, 'TECHNICIAN', 'role');
  });
}

async function step5_createProject() {
  logStep('Step 5: Create Project');

  if (!state.providerToken || !state.providerPersonalOrgId) {
    skipTest('Create project', 'Missing prerequisites');
    return;
  }

  await runTest('Create project in personal org', async () => {
    const res = await api.post(
      '/projects/create',
      {
        addressLine1: `${TEST_RUN_ID} Test Street`,
        city: 'Test City',
        region: 'TC',
        postalCode: '12345',
        countryCode: 'US',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${state.providerToken}`,
          'x-org-id': state.providerPersonalOrgId,
        },
      }
    );

    assertNo500(res, 'create project');
    assertEqual(res.status, 201, 'status');
    assertProperty(res.data, 'id');
    assertProperty(res.data, 'deliveryToken');

    state.projectId = res.data.id;
    state.deliveryToken = res.data.deliveryToken;
  });
}

async function step6_fetchDashboard() {
  logStep('Step 6: Fetch Dashboard');

  if (!state.providerToken || !state.providerPersonalOrgId) {
    skipTest('Fetch dashboard', 'Missing prerequisites');
    return;
  }

  await runTest('Dashboard for personal org', async () => {
    const res = await api.get('/dashboard', {
      headers: {
        Authorization: `Bearer ${state.providerToken}`,
        'x-org-id': state.providerPersonalOrgId,
      },
    });

    assertNo500(res, 'dashboard personal');
    assertEqual(res.status, 200, 'status');
  });

  if (state.companyOrgId) {
    await runTest('Dashboard for company org', async () => {
      const res = await api.get('/dashboard', {
        headers: {
          Authorization: `Bearer ${state.providerToken}`,
          'x-org-id': state.companyOrgId,
        },
      });

      assertNo500(res, 'dashboard company');
      assertEqual(res.status, 200, 'status');
    });
  }
}

async function step7_fetchProjectsMine() {
  logStep('Step 7: Fetch Projects/Mine');

  if (!state.providerToken || !state.providerPersonalOrgId) {
    skipTest('Fetch projects/mine', 'Missing prerequisites');
    return;
  }

  await runTest('Projects/mine for personal org', async () => {
    const res = await api.get('/projects/mine', {
      headers: {
        Authorization: `Bearer ${state.providerToken}`,
        'x-org-id': state.providerPersonalOrgId,
      },
    });

    assertNo500(res, 'projects/mine personal');
    assertEqual(res.status, 200, 'status');
    assertTruthy(Array.isArray(res.data), 'is array');
  });

  await runTest('Projects/mine empty for agent personal org', async () => {
    const res = await api.get('/projects/mine', {
      headers: {
        Authorization: `Bearer ${state.agentToken}`,
        'x-org-id': state.agentPersonalOrgId,
      },
    });

    assertNo500(res, 'projects/mine agent');
    assertEqual(res.status, 200, 'status');
    assertTruthy(Array.isArray(res.data), 'is array');
  });

  await runTest('Projects/mine returns 403 for non-member (not 500)', async () => {
    // Create fresh user
    const email = `${TEST_RUN_ID}-fresh@example.com`;
    const regRes = await api.post('/auth/register', {
      email,
      name: 'Fresh User',
      password: 'TestPassword123!',
      accountType: 'PROVIDER',
    });

    const freshToken = regRes.data.token;

    // Try to access company org they're not a member of
    const res = await api.get('/projects/mine', {
      headers: {
        Authorization: `Bearer ${freshToken}`,
        'x-org-id': state.companyOrgId,
      },
    });

    assertNo500(res, 'projects/mine non-member');
    assertEqual(res.status, 403, 'status');
  });
}

async function step8_fetchDeliveryPage() {
  logStep('Step 8: Fetch Delivery Page');

  if (!state.projectId || !state.deliveryToken) {
    skipTest('Fetch delivery page', 'Missing prerequisites');
    return;
  }

  // Enable delivery first
  await runTest('Enable delivery', async () => {
    const res = await api.post(
      `/projects/${state.projectId}/delivery/enable`,
      {},
      {
        headers: {
          Authorization: `Bearer ${state.providerToken}`,
          'x-org-id': state.providerPersonalOrgId,
        },
      }
    );

    assertNo500(res, 'enable delivery');
    assertEqual(res.status, 201, 'status');
  });

  await runTest('Fetch delivery page (public)', async () => {
    const res = await api.get(`/delivery/${state.deliveryToken}`);

    assertNo500(res, 'delivery page');
    assertEqual(res.status, 200, 'status');
    assertProperty(res.data, 'project');
    assertProperty(res.data, 'organization');
  });

  await runTest('Invalid delivery token returns 404 (not 500)', async () => {
    const res = await api.get('/delivery/invalid-token-12345');

    assertNo500(res, 'invalid delivery token');
    assertEqual(res.status, 404, 'status');
  });
}

async function stepConsistency() {
  logStep('Auth/Org-Context Consistency Checks');

  await runTest('Invalid org header returns 404 (not 500)', async () => {
    const res = await api.get('/projects/mine', {
      headers: {
        Authorization: `Bearer ${state.providerToken}`,
        'x-org-id': 'nonexistent-org-id',
      },
    });

    assertNo500(res, 'invalid org header');
    assertEqual(res.status, 404, 'status');
  });

  await runTest('No org header falls back to personal org', async () => {
    const res = await api.get('/projects/mine', {
      headers: { Authorization: `Bearer ${state.providerToken}` },
    });

    assertNo500(res, 'no org header');
    assertEqual(res.status, 200, 'status');
  });

  await runTest('No auth header returns 401 (not 500)', async () => {
    const res = await api.get('/projects/mine', {
      headers: { 'x-org-id': state.providerPersonalOrgId },
    });

    assertNo500(res, 'no auth header');
    assertEqual(res.status, 401, 'status');
  });
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan(colors.bold('Core Flows Regression Test Suite')));
  console.log('='.repeat(60));
  console.log(`Target: ${colors.yellow(BASE_URL)}`);
  console.log(`Test Run ID: ${TEST_RUN_ID}`);
  console.log('='.repeat(60));

  // Initialize HTTP client
  api = axios.create({
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT,
    validateStatus: () => true, // Don't throw on any status
  });

  // Check server health
  try {
    const healthRes = await api.get('/');
    if (healthRes.status >= 500) {
      throw new Error(`Server returned ${healthRes.status}`);
    }
    log(`\n${colors.green('✓')} Server is reachable`);
  } catch (error) {
    log(`\n${colors.red('✗')} Server is not reachable at ${BASE_URL}`);
    log(`  Make sure the server is running.`);
    process.exit(1);
  }

  // Run test steps
  await step1_createUsers();
  await step2_ensurePersonalOrgs();
  await step3_createOrganization();
  await step4_inviteMembership();
  await step5_createProject();
  await step6_fetchDashboard();
  await step7_fetchProjectsMine();
  await step8_fetchDeliveryPage();
  await stepConsistency();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(colors.bold('SUMMARY'));
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  console.log(`${colors.green('Passed:')} ${passed}`);
  console.log(`${colors.red('Failed:')} ${failed}`);
  console.log(`${colors.yellow('Skipped:')} ${skipped}`);
  console.log(`Total: ${results.length}`);

  if (failed > 0) {
    console.log(`\n${colors.red(colors.bold('REGRESSION TESTS FAILED'))}`);
    console.log('\nFailed tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  ${colors.red('✗')} ${r.name}`);
        console.log(`    ${colors.dim(r.error || '')}`);
      });
    process.exit(1);
  } else {
    console.log(`\n${colors.green(colors.bold('REGRESSION TESTS PASSED'))}`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
