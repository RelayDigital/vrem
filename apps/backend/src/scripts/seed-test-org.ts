import { PrismaClient, OrgRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const TEST_ORG_NAME = 'VX Test Org';

// Test user emails and their corresponding organization roles
// Note: Agents cannot be part of organizations, so they are excluded
const TEST_USERS = [
  { email: 'projectmanager@example.com', orgRole: OrgRole.PROJECT_MANAGER },
  { email: 'editor@example.com', orgRole: OrgRole.EDITOR },
  { email: 'technician@example.com', orgRole: OrgRole.TECHNICIAN },
  { email: 'admin@example.com', orgRole: OrgRole.ADMIN },
];

async function seedTestOrg() {
  const prisma = new PrismaClient();

  try {
    console.log('🌱 Starting test organization seed...');

    // Find or create the test organization
    let testOrg = await prisma.organization.findFirst({
      where: { name: TEST_ORG_NAME },
    });

    if (!testOrg) {
      console.log(`📦 Creating organization: ${TEST_ORG_NAME}`);
      testOrg = await prisma.organization.create({
        data: {
          id: randomUUID(),
          name: TEST_ORG_NAME,
        },
      });
      console.log(`✅ Created organization with ID: ${testOrg.id}`);
    } else {
      console.log(
        `✅ Found existing organization: ${testOrg.name} (ID: ${testOrg.id})`,
      );
    }

    const attachedUsers: string[] = [];
    const skippedUsers: string[] = [];

    // Process each test user
    for (const { email, orgRole } of TEST_USERS) {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.warn(`⚠️  User not found: ${email} - skipping`);
        skippedUsers.push(email);
        continue;
      }

      // Upsert OrganizationMember
      const membership = await prisma.organizationMember.upsert({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: testOrg.id,
          },
        },
        update: {
          role: orgRole,
        },
        create: {
          userId: user.id,
          orgId: testOrg.id,
          role: orgRole,
        },
      });

      console.log(
        `✅ Attached ${email} as ${orgRole} (membership ID: ${membership.id})`,
      );
      attachedUsers.push(email);
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Organization: ${testOrg.name} (${testOrg.id})`);
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
