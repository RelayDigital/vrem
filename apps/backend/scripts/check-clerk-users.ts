/**
 * Script to check detailed status of Clerk test accounts.
 */

import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function main() {
  console.log('🔍 Checking test accounts in detail...\n');

  const users = await clerkClient.users.getUserList({ limit: 100 });

  const testUsers = users.data.filter(u =>
    u.emailAddresses.some(e => e.emailAddress.endsWith('@example.com'))
  );

  for (const user of testUsers) {
    const email = user.emailAddresses[0]?.emailAddress || 'unknown';
    console.log(`\n📧 ${email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Has password: ${user.passwordEnabled}`);
    console.log(`   2FA enabled: ${user.twoFactorEnabled}`);
    console.log(`   TOTP enabled: ${user.totpEnabled}`);
    console.log(`   Backup codes: ${user.backupCodeEnabled}`);
    console.log(`   Primary email verified: ${user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.verification?.status}`);
    console.log(`   Phone numbers: ${user.phoneNumbers.length}`);
    console.log(`   External accounts: ${user.externalAccounts.length}`);
    console.log(`   Created at: ${user.createdAt}`);

    // Check if there are any required verification steps
    console.log(`   First name: ${user.firstName}`);
    console.log(`   Last name: ${user.lastName}`);
  }
}

main().catch(console.error);
