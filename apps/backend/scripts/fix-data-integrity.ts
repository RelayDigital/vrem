/**
 * Fix data integrity issues found by check-architecture.ts
 *
 * Usage:
 *   npx tsx scripts/fix-data-integrity.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { buildPrismaClientOptions } from '../src/prisma/prisma.client-config';

const prisma = new PrismaClient(buildPrismaClientOptions());

async function main() {
  console.log('🔧 Fixing data integrity issues...\n');

  // 1. Fix orphaned OrganizationCustomers (where user was deleted)
  console.log('1. Cleaning up orphaned organization customers...');
  const orphanedCustomers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT oc.id
    FROM "OrganizationCustomer" oc
    LEFT JOIN "User" u ON u.id = oc."userId"
    LEFT JOIN "Organization" o ON o.id = oc."orgId"
    WHERE u.id IS NULL OR o.id IS NULL
  `;

  if (orphanedCustomers.length > 0) {
    const orphanedIds = orphanedCustomers.map((c) => c.id);
    await prisma.organizationCustomer.deleteMany({
      where: { id: { in: orphanedIds } },
    });
    console.log(`   ✅ Deleted ${orphanedCustomers.length} orphaned customer record(s)`);
  } else {
    console.log('   ✅ No orphaned customers to clean up');
  }

  // 2. Fix personal orgs without owners (delete them if no members at all)
  console.log('\n2. Fixing personal orgs without owners...');
  const personalOrgsWithoutOwner = await prisma.$queryRaw<{ id: string; name: string; memberCount: bigint }[]>`
    SELECT o.id, o.name,
           (SELECT COUNT(*) FROM "OrganizationMember" om WHERE om."orgId" = o.id) as "memberCount"
    FROM "Organization" o
    LEFT JOIN "OrganizationMember" om ON om."orgId" = o.id AND om."role" = 'OWNER'
    WHERE o."type" = 'PERSONAL'
    GROUP BY o.id
    HAVING COUNT(om.id) = 0
  `;

  for (const org of personalOrgsWithoutOwner) {
    console.log(`   📋 ${org.name} (${org.id})`);
    console.log(`      Members: ${org.memberCount}`);

    if (org.memberCount === 0n) {
      // No members at all - safe to delete the org
      // First check if there are any projects/jobs in this org
      const projectCount = await prisma.project.count({ where: { orgId: org.id } });

      if (projectCount === 0) {
        // Safe to delete
        await prisma.organization.delete({ where: { id: org.id } });
        console.log(`      ✅ Deleted empty personal org`);
      } else {
        console.log(`      ⚠️  Has ${projectCount} projects - manual review needed`);
      }
    } else {
      // Has members but no owner - promote the first member to owner
      const firstMember = await prisma.organizationMember.findFirst({
        where: { orgId: org.id },
        orderBy: { createdAt: 'asc' },
      });

      if (firstMember) {
        await prisma.organizationMember.update({
          where: { id: firstMember.id },
          data: { role: 'OWNER' },
        });
        console.log(`      ✅ Promoted member ${firstMember.userId} to OWNER`);
      }
    }
  }

  if (personalOrgsWithoutOwner.length === 0) {
    console.log('   ✅ No personal orgs without owners');
  }

  // 3. Fix orphaned OrganizationMembers (where user or org was deleted)
  console.log('\n3. Cleaning up orphaned organization members...');
  const orphanedMembers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT om.id
    FROM "OrganizationMember" om
    LEFT JOIN "User" u ON u.id = om."userId"
    LEFT JOIN "Organization" o ON o.id = om."orgId"
    WHERE u.id IS NULL OR o.id IS NULL
  `;

  if (orphanedMembers.length > 0) {
    const orphanedIds = orphanedMembers.map((m) => m.id);
    await prisma.organizationMember.deleteMany({
      where: { id: { in: orphanedIds } },
    });
    console.log(`   ✅ Deleted ${orphanedMembers.length} orphaned member record(s)`);
  } else {
    console.log('   ✅ No orphaned members to clean up');
  }

  console.log('\n✅ Data integrity fixes complete!');
  console.log('\nRun "npx tsx scripts/check-architecture.ts" to verify.');
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
