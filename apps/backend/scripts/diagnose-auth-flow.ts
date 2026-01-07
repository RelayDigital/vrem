#!/usr/bin/env npx ts-node
/**
 * Auth/Org/Projects Flow Diagnostic Script
 *
 * Tests the complete authentication and organization loading flow,
 * printing detailed debug information at each step.
 *
 * Usage:
 *   npx ts-node scripts/diagnose-auth-flow.ts [email] [password]
 *
 * Examples:
 *   npx ts-node scripts/diagnose-auth-flow.ts                    # Uses default test account
 *   npx ts-node scripts/diagnose-auth-flow.ts test@example.com TestPassword123!
 *
 * Environment variables:
 *   TEST_EMAIL    - Test account email
 *   TEST_PASSWORD - Test account password
 *   API_URL       - Backend API URL (default: http://localhost:3001)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_EMAIL = process.argv[2] || process.env.TEST_EMAIL || 'company@example.com';
const TEST_PASSWORD = process.argv[3] || process.env.TEST_PASSWORD || 'TestPassword123!';

// Colored output helpers
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

function logSection(title: string) {
  console.log('\n' + colors.cyan('═'.repeat(60)));
  console.log(colors.cyan(colors.bold(` ${title} `)));
  console.log(colors.cyan('═'.repeat(60)));
}

function logStep(step: string) {
  console.log(`\n${colors.cyan('▶')} ${step}`);
}

function logInfo(key: string, value: any) {
  const val = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  console.log(`  ${colors.dim(key + ':')} ${val}`);
}

function logSuccess(message: string) {
  console.log(`  ${colors.green('✓')} ${message}`);
}

function logError(message: string) {
  console.log(`  ${colors.red('✗')} ${message}`);
}

function logWarning(message: string) {
  console.log(`  ${colors.yellow('⚠')} ${message}`);
}

// Test state
interface DiagnosticState {
  token?: string;
  userId?: string;
  personalOrgId?: string;
  memberships?: any[];
  recommendedOrgId?: string;
  accountType?: string;
  orgType?: string;
}

const state: DiagnosticState = {};

// HTTP client
let api: AxiosInstance;

async function checkServerHealth(): Promise<boolean> {
  logStep('Checking server health');
  try {
    const res = await api.get('/');
    logSuccess(`Server reachable at ${API_URL}`);
    logInfo('Response status', res.status);
    return true;
  } catch (error: any) {
    logError(`Server not reachable at ${API_URL}`);
    if (error.code === 'ECONNREFUSED') {
      logInfo('Error', 'Connection refused - is the backend running?');
    } else {
      logInfo('Error', error.message);
    }
    return false;
  }
}

async function testLogin(): Promise<boolean> {
  logStep('Testing login (via test-login endpoint)');
  logInfo('Email', TEST_EMAIL);
  logInfo('API URL', `${API_URL}/auth/test-login`);

  try {
    const res = await api.post('/auth/test-login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (res.status >= 400) {
      logError(`Login failed with status ${res.status}`);
      logInfo('Response', res.data);
      return false;
    }

    if (!res.data?.token) {
      logError('Login response missing token');
      logInfo('Response', res.data);
      return false;
    }

    state.token = res.data.token;
    logSuccess('Login successful');
    logInfo('Token (first 50 chars)', state.token!.substring(0, 50) + '...');
    return true;
  } catch (error: any) {
    logError('Login request failed');
    if (error.response) {
      logInfo('Status', error.response.status);
      logInfo('Response', error.response.data);
    } else {
      logInfo('Error', error.message);
    }
    return false;
  }
}

async function testBootstrap(): Promise<boolean> {
  logStep('Testing bootstrap endpoint (/auth/me/bootstrap)');

  if (!state.token) {
    logWarning('No token - skipping bootstrap test');
    return false;
  }

  try {
    const res = await api.get('/auth/me/bootstrap', {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    if (res.status >= 400) {
      logError(`Bootstrap failed with status ${res.status}`);
      logInfo('Response', res.data);
      return false;
    }

    logSuccess('Bootstrap successful');
    state.userId = res.data.id;
    state.personalOrgId = res.data.personalOrgId;
    state.memberships = res.data.memberships || [];
    state.recommendedOrgId = res.data.recommendedActiveOrgId;
    state.accountType = res.data.accountType;

    logInfo('User ID', state.userId);
    logInfo('Account Type', state.accountType);
    logInfo('Personal Org ID', state.personalOrgId);
    logInfo('Recommended Org ID', state.recommendedOrgId || 'NONE');
    logInfo('Memberships count', state.memberships?.length || 0);

    if (state.memberships && state.memberships.length > 0) {
      console.log('\n  Memberships:');
      for (const m of state.memberships!) {
        const orgName = m.organization?.name || 'Unknown';
        const orgType = m.organization?.type || 'Unknown';
        console.log(`    - ${m.orgId} (${orgName}, ${orgType}) role=${m.role || m.orgRole}`);
      }
    }

    return true;
  } catch (error: any) {
    logError('Bootstrap request failed');
    if (error.response) {
      logInfo('Status', error.response.status);
      logInfo('Response', error.response.data);
    } else {
      logInfo('Error', error.message);
    }
    return false;
  }
}

async function testProjectsMine(orgId?: string): Promise<boolean> {
  const targetOrgId = orgId || state.recommendedOrgId || state.personalOrgId;
  logStep(`Testing projects/mine endpoint (orgId: ${targetOrgId || 'NONE'})`);

  if (!state.token) {
    logWarning('No token - skipping projects test');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${state.token}`,
    };
    if (targetOrgId) {
      headers['x-org-id'] = targetOrgId;
    }

    logInfo('Request headers', { 'x-org-id': targetOrgId || 'NOT SET', Authorization: 'Bearer [redacted]' });

    const res = await api.get('/projects/mine', { headers });

    if (res.status >= 400) {
      logError(`Projects request failed with status ${res.status}`);
      logInfo('Response', res.data);
      return false;
    }

    logSuccess('Projects request successful');
    logInfo('Projects count', res.data?.length || 0);

    if (res.data?.length > 0) {
      console.log('\n  Sample projects:');
      for (const p of res.data.slice(0, 3)) {
        const address = p.addressLine1 || p.city || 'No address';
        console.log(`    - ${p.id} (${address}) status=${p.status}`);
      }
      if (res.data.length > 3) {
        console.log(`    ... and ${res.data.length - 3} more`);
      }
    }

    return true;
  } catch (error: any) {
    logError('Projects request failed');
    if (error.response) {
      logInfo('Status', error.response.status);
      logInfo('Response', error.response.data);
    } else {
      logInfo('Error', error.message);
    }
    return false;
  }
}

async function testDashboard(orgId?: string): Promise<boolean> {
  const targetOrgId = orgId || state.recommendedOrgId || state.personalOrgId;
  logStep(`Testing dashboard endpoint (orgId: ${targetOrgId || 'NONE'})`);

  if (!state.token) {
    logWarning('No token - skipping dashboard test');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${state.token}`,
    };
    if (targetOrgId) {
      headers['x-org-id'] = targetOrgId;
    }

    const res = await api.get('/dashboard', { headers });

    if (res.status >= 400) {
      logError(`Dashboard request failed with status ${res.status}`);
      logInfo('Response', res.data);
      return false;
    }

    logSuccess('Dashboard request successful');
    logInfo('Projects count', res.data?.projects?.length || 0);
    logInfo('Has metrics', !!res.data?.metrics);

    return true;
  } catch (error: any) {
    logError('Dashboard request failed');
    if (error.response) {
      logInfo('Status', error.response.status);
      logInfo('Response', error.response.data);
    } else {
      logInfo('Error', error.message);
    }
    return false;
  }
}

async function testOrganizationsList(): Promise<boolean> {
  logStep('Testing organizations list endpoint');

  if (!state.token) {
    logWarning('No token - skipping organizations test');
    return false;
  }

  try {
    const res = await api.get('/organizations', {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    if (res.status >= 400) {
      logError(`Organizations request failed with status ${res.status}`);
      logInfo('Response', res.data);
      return false;
    }

    logSuccess('Organizations request successful');
    logInfo('Organizations count', res.data?.length || 0);

    if (res.data?.length > 0) {
      console.log('\n  Organizations:');
      for (const m of res.data) {
        const org = m.organization || {};
        console.log(`    - ${m.orgId} (${org.name || 'Unknown'}, ${org.type || 'Unknown'}) role=${m.role || m.orgRole}`);
      }
    }

    return true;
  } catch (error: any) {
    logError('Organizations request failed');
    if (error.response) {
      logInfo('Status', error.response.status);
      logInfo('Response', error.response.data);
    } else {
      logInfo('Error', error.message);
    }
    return false;
  }
}

async function testWithDifferentOrgs(): Promise<void> {
  logSection('Testing with different org contexts');

  if (!state.memberships || state.memberships.length === 0) {
    logWarning('No memberships to test');
    return;
  }

  // Test with each org the user is a member of
  for (const m of state.memberships.slice(0, 3)) {
    const orgName = m.organization?.name || 'Unknown';
    const orgType = m.organization?.type || 'Unknown';
    console.log(`\n${colors.yellow('Testing org:')} ${m.orgId} (${orgName}, ${orgType})`);
    await testProjectsMine(m.orgId);
  }
}

async function main() {
  console.log(colors.cyan('\n' + '═'.repeat(60)));
  console.log(colors.cyan(colors.bold(' Auth/Org/Projects Flow Diagnostic ')));
  console.log(colors.cyan('═'.repeat(60)));
  logInfo('API URL', API_URL);
  logInfo('Test Email', TEST_EMAIL);
  console.log(colors.cyan('═'.repeat(60)));

  // Initialize HTTP client
  api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    validateStatus: () => true, // Don't throw on any status
  });

  // Run diagnostics
  logSection('1. Server Health');
  const serverOk = await checkServerHealth();
  if (!serverOk) {
    console.log(`\n${colors.red('DIAGNOSTIC FAILED: Server not reachable')}`);
    process.exit(1);
  }

  logSection('2. Authentication');
  const loginOk = await testLogin();
  if (!loginOk) {
    console.log(`\n${colors.red('DIAGNOSTIC FAILED: Login failed')}`);
    console.log('Check if test accounts are set up correctly.');
    process.exit(1);
  }

  logSection('3. Bootstrap (User + Org Provisioning)');
  const bootstrapOk = await testBootstrap();
  if (!bootstrapOk) {
    console.log(`\n${colors.red('DIAGNOSTIC FAILED: Bootstrap failed')}`);
    process.exit(1);
  }

  logSection('4. Organizations List');
  await testOrganizationsList();

  logSection('5. Projects (with recommended org)');
  await testProjectsMine();

  logSection('6. Dashboard');
  await testDashboard();

  await testWithDifferentOrgs();

  // Summary
  logSection('Diagnostic Summary');
  logSuccess('Server: Reachable');
  logSuccess(`Auth: Token obtained for ${TEST_EMAIL}`);
  logSuccess(`Bootstrap: User ${state.userId} with ${state.memberships?.length || 0} org(s)`);
  logInfo('Personal Org', state.personalOrgId || 'MISSING');
  logInfo('Recommended Org', state.recommendedOrgId || 'NONE');
  logInfo('Account Type', state.accountType || 'UNKNOWN');

  console.log(`\n${colors.green('DIAGNOSTIC COMPLETE')}`);
  console.log('\nTo view backend debug logs, run the backend with DEBUG=* or check the console output.');
  console.log('To view frontend debug logs, open browser DevTools and filter by [AuthContext] or [API].');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
