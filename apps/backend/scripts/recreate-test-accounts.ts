/**
 * Script to delete and recreate test accounts with proper settings.
 *
 * Usage:
 *   npx tsx scripts/recreate-test-accounts.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import { buildPrismaClientOptions } from '../src/prisma/prisma.client-config';

const prisma = new PrismaClient(buildPrismaClientOptions());
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const TEST_PASSWORD = 'password123';

async function main() {
  console.log('🔄 Recreating test accounts...\n');

  // Get test users from database
  const testUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: '@example.com' },
      clerkUserId: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      accountType: true,
      clerkUserId: true,
    },
  });

  console.log(`Found ${testUsers.length} test account(s) to recreate\n`);

  for (const user of testUsers) {
    console.log(`\n📧 Processing: ${user.email}`);

    try {
      // 1. Delete existing Clerk user
      if (user.clerkUserId) {
        console.log(`   Deleting Clerk user: ${user.clerkUserId}`);
        try {
          await clerkClient.users.deleteUser(user.clerkUserId);
          console.log(`   ✅ Deleted from Clerk`);
        } catch (deleteErr: any) {
          if (deleteErr.status === 404) {
            console.log(`   ⚠️  User not found in Clerk, continuing...`);
          } else {
            throw deleteErr;
          }
        }
      }

      // 2. Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Recreate in Clerk with proper settings
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log(`   Creating new Clerk user...`);

      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [user.email],
        firstName,
        lastName,
        password: TEST_PASSWORD,
        skipPasswordChecks: true,
        // These flags should help with the MFA requirement
        skipPasswordRequirement: false,
        unsafeMetadata: {
          accountType: user.accountType,
          isTestAccount: true,
        },
      });

      console.log(`   ✅ Created: ${clerkUser.id}`);

      // 4. Update database with new Clerk ID
      await prisma.user.update({
        where: { id: user.id },
        data: { clerkUserId: clerkUser.id },
      });

      console.log(`   ✅ Database updated`);

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Done!');
  console.log('\nTest accounts should now be able to log in with:');
  console.log('  Password: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
