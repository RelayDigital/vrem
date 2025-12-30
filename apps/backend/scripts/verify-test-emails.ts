/**
 * Script to verify email addresses for test accounts so they can log in.
 *
 * Usage:
 *   npx tsx scripts/verify-test-emails.ts
 */

import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function main() {
  console.log('🔍 Finding test accounts with unverified emails...\n');

  // Get all users
  const users = await clerkClient.users.getUserList({ limit: 100 });

  const testUsers = users.data.filter(u =>
    u.emailAddresses.some(e => e.emailAddress.endsWith('@example.com'))
  );

  console.log(`Found ${testUsers.length} test account(s)\n`);

  for (const user of testUsers) {
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    const email = primaryEmail?.emailAddress || 'unknown';

    try {
      if (primaryEmail && primaryEmail.verification?.status !== 'verified') {
        console.log(`  📧 Verifying email for: ${email}`);
        console.log(`     Current status: ${primaryEmail.verification?.status || 'unverified'}`);

        // Update the email to be verified
        // Note: Clerk doesn't have a direct "verify email" API endpoint
        // We need to use a workaround by updating the user

        // Try to update the email verification status
        try {
          await clerkClient.emailAddresses.updateEmailAddress(primaryEmail.id, {
            verified: true,
          });
          console.log(`     ✅ Email verified!`);
        } catch (updateErr: any) {
          console.log(`     ⚠️  Cannot directly verify - ${updateErr.message}`);
          console.log(`     Try: Delete and recreate user with verified email`);
        }
      } else {
        console.log(`  ✅ Already verified: ${email}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error checking ${email}: ${error.message}`);
    }
  }

  console.log('\n📋 Done!');
}

main().catch(console.error);
