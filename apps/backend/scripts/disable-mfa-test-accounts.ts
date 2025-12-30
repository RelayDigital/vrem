/**
 * Script to disable MFA for test accounts created via migration.
 *
 * Usage:
 *   npx tsx scripts/disable-mfa-test-accounts.ts
 */

import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function main() {
  console.log('🔍 Finding test accounts with MFA enabled...\n');

  // Get all users
  const users = await clerkClient.users.getUserList({ limit: 100 });

  const testUsers = users.data.filter(u =>
    u.emailAddresses.some(e => e.emailAddress.endsWith('@example.com'))
  );

  console.log(`Found ${testUsers.length} test account(s)\n`);

  for (const user of testUsers) {
    const email = user.emailAddresses[0]?.emailAddress || 'unknown';

    try {
      // Check if user has any second factors
      if (user.twoFactorEnabled) {
        console.log(`  🔓 Disabling 2FA for: ${email}`);

        // We can't directly disable 2FA via API, but we can delete and recreate
        // For now, just log which accounts need attention
        console.log(`     ⚠️  User has 2FA enabled - may need manual intervention in Clerk dashboard`);
      } else {
        console.log(`  ✅ No 2FA: ${email}`);
      }

      // Check TOTP and backup codes
      const totpFactors = user.totpEnabled;
      const backupCodes = user.backupCodeEnabled;

      if (totpFactors || backupCodes) {
        console.log(`     TOTP: ${totpFactors}, Backup codes: ${backupCodes}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error checking ${email}: ${error.message}`);
    }
  }

  console.log('\n📋 Summary:');
  console.log('If any accounts have MFA enabled, you may need to:');
  console.log('1. Go to Clerk Dashboard -> Users');
  console.log('2. Find the test account');
  console.log('3. Remove any 2FA methods');
  console.log('\nAlternatively, delete and recreate the accounts without MFA.');
}

main().catch(console.error);
