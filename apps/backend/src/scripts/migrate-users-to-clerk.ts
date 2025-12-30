import { createClerkClient } from '@clerk/backend';
import prisma from '../prisma/prisma.client';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Default password for migrated users (they should reset via Clerk)
const DEFAULT_PASSWORD = 'TempPassword123!';

interface MigrationResult {
  email: string;
  success: boolean;
  clerkUserId?: string;
  error?: string;
}

async function migrateUsersToClerk() {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY environment variable is not set');
    process.exit(1);
  }

  console.log('🚀 Starting migration of existing users to Clerk...\n');

  const results: MigrationResult[] = [];

  try {
    // Find all users without a clerkUserId
    const usersToMigrate = await prisma.user.findMany({
      where: {
        clerkUserId: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        useCases: {
          select: {
            useCase: true,
          },
        },
      },
    });

    console.log(`📋 Found ${usersToMigrate.length} users to migrate\n`);

    if (usersToMigrate.length === 0) {
      console.log('✨ No users need migration!');
      return;
    }

    for (const user of usersToMigrate) {
      console.log(`\n👤 Migrating user: ${user.email}`);

      try {
        // Check if user already exists in Clerk by email
        const existingClerkUsers = await clerkClient.users.getUserList({
          emailAddress: [user.email],
        });

        let clerkUserId: string;

        if (existingClerkUsers.data.length > 0) {
          // User already exists in Clerk, just link them
          clerkUserId = existingClerkUsers.data[0].id;
          console.log(`   ℹ️  User already exists in Clerk: ${clerkUserId}`);
        } else {
          // Split name into first and last name
          const nameParts = user.name.trim().split(' ');
          const firstName = nameParts[0] || 'User';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Prepare use cases for metadata
          const useCases = user.useCases.map((uc) => uc.useCase);

          // Create user in Clerk
          const clerkUser = await clerkClient.users.createUser({
            emailAddress: [user.email],
            password: DEFAULT_PASSWORD,
            firstName,
            lastName,
            skipPasswordChecks: true, // Allow simple password for migration
            unsafeMetadata: {
              accountType: user.accountType,
              useCases: useCases.length > 0 ? useCases : undefined,
              migratedFromLegacy: true,
              migratedAt: new Date().toISOString(),
            },
          });

          clerkUserId = clerkUser.id;
          console.log(`   ✅ Created Clerk user: ${clerkUserId}`);
        }

        // Update our database with the Clerk user ID
        await prisma.user.update({
          where: { id: user.id },
          data: { clerkUserId },
        });

        console.log(`   ✅ Updated database with clerkUserId`);

        results.push({
          email: user.email,
          success: true,
          clerkUserId,
        });
      } catch (error: any) {
        console.error(`   ❌ Failed to migrate: ${error.message}`);

        // Check for specific Clerk errors
        if (error.errors) {
          for (const err of error.errors) {
            console.error(`      - ${err.code}: ${err.message}`);
          }
        }

        results.push({
          email: user.email,
          success: false,
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`\n✅ Successfully migrated: ${successful.length}`);
    for (const result of successful) {
      console.log(`   - ${result.email} → ${result.clerkUserId}`);
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed to migrate: ${failed.length}`);
      for (const result of failed) {
        console.log(`   - ${result.email}: ${result.error}`);
      }
    }

    console.log('\n⚠️  Important Notes:');
    console.log(`   - Migrated users have temporary password: ${DEFAULT_PASSWORD}`);
    console.log('   - Users should be asked to reset their password via Clerk');
    console.log('   - Or use "Forgot Password" flow on login page');

    console.log('\n✨ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateUsersToClerk()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
