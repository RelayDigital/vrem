/**
 * Migration script to create Clerk accounts for users that only exist in the database.
 *
 * Usage:
 *   npx tsx scripts/migrate-users-to-clerk.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --delete     Delete DB-only users instead of migrating them
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import { buildPrismaClientOptions } from '../src/prisma/prisma.client-config';

const prisma = new PrismaClient(buildPrismaClientOptions());
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_MODE = process.argv.includes('--delete');

async function main() {
  console.log('🔍 Finding users without Clerk accounts...\n');

  // Find all users that don't have a clerkUserId
  const usersWithoutClerk = await prisma.user.findMany({
    where: {
      clerkUserId: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      accountType: true,
      createdAt: true,
      organizations: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (usersWithoutClerk.length === 0) {
    console.log('✅ All users already have Clerk accounts!');
    return;
  }

  console.log(`Found ${usersWithoutClerk.length} user(s) without Clerk accounts:\n`);

  for (const user of usersWithoutClerk) {
    const orgs = user.organizations.map(m => `${m.organization.name} (${m.role})`).join(', ');
    console.log(`  - ${user.email}`);
    console.log(`    Name: ${user.name}`);
    console.log(`    Type: ${user.accountType}`);
    console.log(`    Orgs: ${orgs || 'None'}`);
    console.log(`    Created: ${user.createdAt.toISOString()}`);
    console.log('');
  }

  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No changes will be made.\n');
    return;
  }

  if (DELETE_MODE) {
    console.log('🗑️  DELETE MODE - Removing DB-only users...\n');

    for (const user of usersWithoutClerk) {
      try {
        // Delete related data first
        await prisma.tourProgress.deleteMany({ where: { userId: user.id } });
        await prisma.tourStatus.deleteMany({ where: { userId: user.id } });
        await prisma.notification.deleteMany({ where: { userId: user.id } });
        await prisma.messageRead.deleteMany({ where: { userId: user.id } });
        await prisma.message.deleteMany({ where: { userId: user.id } });
        await prisma.userAvailability.deleteMany({ where: { userId: user.id } });
        await prisma.userAvailabilityStatus.deleteMany({ where: { userId: user.id } });
        await prisma.userCalendarIntegration.deleteMany({ where: { userId: user.id } });
        await prisma.userIcsFeed.deleteMany({ where: { userId: user.id } });
        await prisma.providerUseCase.deleteMany({ where: { userId: user.id } });
        await prisma.organizationCustomer.deleteMany({ where: { userId: user.id } });
        await prisma.organizationMember.deleteMany({ where: { userId: user.id } });

        // Delete the user
        await prisma.user.delete({ where: { id: user.id } });

        console.log(`  ✅ Deleted: ${user.email}`);
      } catch (error: any) {
        console.error(`  ❌ Failed to delete ${user.email}: ${error.message}`);
      }
    }

    console.log('\n✅ Deletion complete!');
    return;
  }

  console.log('📝 Creating Clerk accounts...\n');

  let successCount = 0;
  let failCount = 0;

  for (const user of usersWithoutClerk) {
    try {
      // Parse first and last name from full name
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create Clerk user (they'll need to reset their password)
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [user.email],
        firstName,
        lastName,
        skipPasswordRequirement: true,
        unsafeMetadata: {
          accountType: user.accountType,
          migratedFromDb: true,
          migratedAt: new Date().toISOString(),
        },
      });

      // Update database with Clerk user ID
      await prisma.user.update({
        where: { id: user.id },
        data: { clerkUserId: clerkUser.id },
      });

      console.log(`  ✅ Migrated: ${user.email} -> ${clerkUser.id} (needs password reset)`);
      successCount++;
    } catch (error: any) {
      console.error(`  ❌ Failed to migrate ${user.email}: ${error.message}`);

      // Check if user already exists in Clerk (maybe with different email casing)
      if (error.message?.includes('already exists')) {
        try {
          // Try to find existing Clerk user by email
          const existingUsers = await clerkClient.users.getUserList({
            emailAddress: [user.email],
          });

          if (existingUsers.data.length > 0) {
            const existingClerkUser = existingUsers.data[0];
            await prisma.user.update({
              where: { id: user.id },
              data: { clerkUserId: existingClerkUser.id },
            });
            console.log(`  🔗 Linked existing Clerk user: ${user.email} -> ${existingClerkUser.id}`);
            successCount++;
            continue;
          }
        } catch (linkError: any) {
          console.error(`  ❌ Failed to link existing user: ${linkError.message}`);
        }
      }

      failCount++;
    }
  }

  console.log(`\n📊 Migration complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);

  if (failCount > 0) {
    console.log('\n⚠️  Some users failed to migrate. They may need manual intervention.');
    console.log('   Users without Clerk accounts cannot log in.');
  }
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
