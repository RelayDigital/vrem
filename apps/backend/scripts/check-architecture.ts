/**
 * Architecture validation script
 * Checks for common issues in the user/org data model
 *
 * Usage:
 *   npx tsx scripts/check-architecture.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { buildPrismaClientOptions } from '../src/prisma/prisma.client-config';

const prisma = new PrismaClient(buildPrismaClientOptions());

async function main() {
  console.log('🔍 Architecture Validation\n');
  let hasIssues = false;

  // 1. Check for duplicate clerkUserIds
  console.log('1. Checking for duplicate clerkUserIds...');
  const dupes = await prisma.$queryRaw<{ clerkUserId: string; count: bigint }[]>`
    SELECT "clerkUserId", COUNT(*) as count
    FROM "User"
    WHERE "clerkUserId" IS NOT NULL
    GROUP BY "clerkUserId"
    HAVING COUNT(*) > 1
  `;
  if (dupes.length === 0) {
    console.log('   ✅ No duplicate clerkUserIds');
  } else {
    console.log('   ❌ Found duplicate clerkUserIds:');
    dupes.forEach((d) => console.log(`      ${d.clerkUserId}: ${d.count} users`));
    hasIssues = true;
  }

  // 2. Check all users have personal org
  console.log('\n2. Checking all users have personal org...');
  const usersWithoutPersonalOrg = await prisma.$queryRaw<{ id: string; email: string }[]>`
    SELECT u.id, u.email
    FROM "User" u
    WHERE NOT EXISTS (
      SELECT 1 FROM "OrganizationMember" om
      JOIN "Organization" o ON o.id = om."orgId"
      WHERE om."userId" = u.id AND o."type" = 'PERSONAL'
    )
  `;
  if (usersWithoutPersonalOrg.length === 0) {
    console.log('   ✅ All users have personal orgs');
  } else {
    console.log('   ❌ Users without personal org:');
    usersWithoutPersonalOrg.forEach((u) => console.log(`      ${u.email} (${u.id})`));
    hasIssues = true;
  }

  // 3. Check org members have valid roles
  console.log('\n3. Checking org member roles...');
  // Valid roles from OrgRole enum: OWNER, ADMIN, TECHNICIAN, EDITOR, PROJECT_MANAGER, AGENT
  const invalidRoles = await prisma.$queryRaw<{ userId: string; email: string; role: string }[]>`
    SELECT om."userId", u.email, om."role"
    FROM "OrganizationMember" om
    JOIN "User" u ON u.id = om."userId"
    WHERE om."role" NOT IN ('OWNER', 'ADMIN', 'TECHNICIAN', 'EDITOR', 'PROJECT_MANAGER', 'AGENT')
  `;
  if (invalidRoles.length === 0) {
    console.log('   ✅ All org roles are valid');
  } else {
    console.log('   ❌ Invalid org roles found:');
    invalidRoles.forEach((r) => console.log(`      ${r.email}: ${r.role}`));
    hasIssues = true;
  }

  // 4. Check personal orgs have exactly one OWNER
  console.log('\n4. Checking personal org ownership...');
  const personalOrgIssues = await prisma.$queryRaw<{ orgId: string; name: string; ownerCount: bigint }[]>`
    SELECT o.id as "orgId", o.name, COUNT(om.id) as "ownerCount"
    FROM "Organization" o
    LEFT JOIN "OrganizationMember" om ON om."orgId" = o.id AND om."role" = 'OWNER'
    WHERE o."type" = 'PERSONAL'
    GROUP BY o.id
    HAVING COUNT(om.id) != 1
  `;
  if (personalOrgIssues.length === 0) {
    console.log('   ✅ All personal orgs have exactly one owner');
  } else {
    console.log('   ❌ Personal orgs with ownership issues:');
    personalOrgIssues.forEach((o) => console.log(`      ${o.name}: ${o.ownerCount} owners`));
    hasIssues = true;
  }

  // 5. Check for orphaned OrganizationMembers
  console.log('\n5. Checking for orphaned organization members...');
  const orphanedMembers = await prisma.$queryRaw<{ id: string; userId: string; orgId: string }[]>`
    SELECT om.id, om."userId", om."orgId"
    FROM "OrganizationMember" om
    LEFT JOIN "User" u ON u.id = om."userId"
    LEFT JOIN "Organization" o ON o.id = om."orgId"
    WHERE u.id IS NULL OR o.id IS NULL
  `;
  if (orphanedMembers.length === 0) {
    console.log('   ✅ No orphaned organization members');
  } else {
    console.log('   ❌ Found orphaned organization members:');
    orphanedMembers.forEach((m) => console.log(`      Member ${m.id}: user=${m.userId}, org=${m.orgId}`));
    hasIssues = true;
  }

  // 6. Check for orphaned OrganizationCustomers
  console.log('\n6. Checking for orphaned organization customers...');
  const orphanedCustomers = await prisma.$queryRaw<{ id: string; userId: string; orgId: string }[]>`
    SELECT oc.id, oc."userId", oc."orgId"
    FROM "OrganizationCustomer" oc
    LEFT JOIN "User" u ON u.id = oc."userId"
    LEFT JOIN "Organization" o ON o.id = oc."orgId"
    WHERE u.id IS NULL OR o.id IS NULL
  `;
  if (orphanedCustomers.length === 0) {
    console.log('   ✅ No orphaned organization customers');
  } else {
    console.log('   ❌ Found orphaned organization customers:');
    orphanedCustomers.forEach((c) => console.log(`      Customer ${c.id}: user=${c.userId}, org=${c.orgId}`));
    hasIssues = true;
  }

  // 7. Check accountType distribution
  console.log('\n7. Checking accountType distribution...');
  const accountTypes = await prisma.user.groupBy({
    by: ['accountType'],
    _count: true,
  });
  console.log('   Account types:');
  accountTypes.forEach((at) => console.log(`      ${at.accountType}: ${at._count} users`));

  // 8. Check organization type distribution
  console.log('\n8. Checking organization type distribution...');
  const orgTypes = await prisma.organization.groupBy({
    by: ['type'],
    _count: true,
  });
  console.log('   Organization types:');
  orgTypes.forEach((ot) => console.log(`      ${ot.type}: ${ot._count} orgs`));

  // 9. Summary counts
  console.log('\n📊 Summary:');
  const userCount = await prisma.user.count();
  const orgCount = await prisma.organization.count();
  const membershipCount = await prisma.organizationMember.count();
  const customerCount = await prisma.organizationCustomer.count();

  console.log(`   Users: ${userCount}`);
  console.log(`   Organizations: ${orgCount}`);
  console.log(`   Memberships: ${membershipCount}`);
  console.log(`   Customer relationships: ${customerCount}`);

  // Final result
  console.log('\n' + (hasIssues ? '❌ Issues found - review above' : '✅ All checks passed!'));
  process.exit(hasIssues ? 1 : 0);
}

main()
  .catch((err) => {
    console.error('Error running validation:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
