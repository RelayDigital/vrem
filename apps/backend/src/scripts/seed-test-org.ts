import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

const TEST_ORG_NAME = 'VX Test Org';

// Test users to seed
const TEST_USERS: Array<{
  email: string;
  accountType: 'COMPANY' | 'PROVIDER';
  orgRole:
    | 'OWNER'
    | 'ADMIN'
    | 'PROJECT_MANAGER'
    | 'TECHNICIAN'
    | 'EDITOR';
}> = [
  { email: 'owner@example.com', accountType: 'COMPANY', orgRole: 'OWNER' }, // only global company-level user
  { email: 'editor@example.com', accountType: 'PROVIDER', orgRole: 'EDITOR' },
  { email: 'projectmanager@example.com', accountType: 'PROVIDER', orgRole: 'PROJECT_MANAGER' },
  { email: 'technician@example.com', accountType: 'PROVIDER', orgRole: 'TECHNICIAN' },
  { email: 'admin@example.com', accountType: 'PROVIDER', orgRole: 'ADMIN' },
  { email: 'technician2@example.com', accountType: 'PROVIDER', orgRole: 'TECHNICIAN' },
  { email: 'technician3@example.com', accountType: 'PROVIDER', orgRole: 'TECHNICIAN' },
];

async function seedTestOrg() {
  const prisma = new PrismaClient();

  try {
    console.log('🌱 Starting test organization seed...');

    // Find or create the test organization
    const orgResult = await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Organization" WHERE name = ${TEST_ORG_NAME} LIMIT 1`;
    let orgId = orgResult[0]?.id;

    if (!orgId) {
      orgId = randomUUID();
      console.log(`📦 Creating organization: ${TEST_ORG_NAME}`);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Organization" (id, name, "createdAt") VALUES ($1, $2, NOW())`,
        orgId,
        TEST_ORG_NAME,
      );
      console.log(`✅ Created organization with ID: ${orgId}`);
    } else {
      console.log(`✅ Found existing organization: ${TEST_ORG_NAME} (ID: ${orgId})`);
    }

    const attachedUsers: string[] = [];
    const skippedUsers: string[] = [];

    // Process each test user
    for (const { email, orgRole, accountType } of TEST_USERS) {
      const userRows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "User" WHERE email = ${email} LIMIT 1
      `;
      let userId = userRows[0]?.id;

      if (!userId) {
        const passwordHash = await bcrypt.hash('password123', 10);
        userId = randomUUID();
        const name = email.split('@')[0];
        await prisma.$executeRawUnsafe(
          `INSERT INTO "User" (id, email, name, password, "accountType", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5::"Role", NOW(), NOW())`,
          userId,
          email,
          name,
          passwordHash,
          accountType,
        );
        console.log(`✅ Created user ${email} with accountType ${accountType}`);
      }

      const membershipRows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "OrganizationMember"
        WHERE "userId" = ${userId} AND "orgId" = ${orgId}
        LIMIT 1
      `;

      if (!membershipRows[0]?.id) {
        const membershipId = randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO "OrganizationMember" (id, "userId", "orgId", role, "createdAt")
           VALUES ($1, $2, $3, $4::"OrgRole", NOW())`,
          membershipId,
          userId,
          orgId,
          orgRole,
        );
        console.log(
          `✅ Attached ${email} as ${orgRole} (membership ID: ${membershipId})`,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "OrganizationMember" SET role = $1::"OrgRole" WHERE id = $2`,
          orgRole,
          membershipRows[0].id,
        );
        console.log(
          `✅ Updated ${email} role to ${orgRole} (membership ID: ${membershipRows[0].id})`,
        );
      }

      attachedUsers.push(email);
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Organization: ${TEST_ORG_NAME} (${orgId})`);
    console.log(`   Users attached: ${attachedUsers.length}`);
    if (attachedUsers.length > 0) {
      console.log(`   - ${attachedUsers.join('\n   - ')}`);
    }
    if (skippedUsers.length > 0) {
      console.log(`   Users skipped (not found): ${skippedUsers.length}`);
      console.log(`   - ${skippedUsers.join('\n   - ')}`);
    }

    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding test organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedTestOrg()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
