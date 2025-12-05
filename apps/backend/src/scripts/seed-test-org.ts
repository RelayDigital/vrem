import { PrismaClient, OrgRole, UserAccountType } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

const TEST_ORG_NAME = 'VX Test Org';

// Test users to seed
const TEST_USERS: Array<{
  email: string;
  accountType: UserAccountType;
  orgRole: OrgRole;
}> = [
  { email: 'owner@example.com', accountType: UserAccountType.COMPANY, orgRole: OrgRole.OWNER }, // only global company-level user
  { email: 'editor@example.com', accountType: UserAccountType.PROVIDER, orgRole: OrgRole.EDITOR },
  { email: 'projectmanager@example.com', accountType: UserAccountType.PROVIDER, orgRole: OrgRole.PROJECT_MANAGER },
  { email: 'technician@example.com', accountType: UserAccountType.PROVIDER, orgRole: OrgRole.TECHNICIAN },
  { email: 'admin@example.com', accountType: UserAccountType.PROVIDER, orgRole: OrgRole.ADMIN },
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
    for (const { email, orgRole, accountType } of TEST_USERS) {
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        const passwordHash = await bcrypt.hash('password123', 10);
        user = await prisma.user.create({
          data: {
            id: randomUUID(),
            email,
            name: email.split('@')[0],
            password: passwordHash,
            accountType,
          },
        });
        console.log(`✅ Created user ${email} with accountType ${accountType}`);
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
