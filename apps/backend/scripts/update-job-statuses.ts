/**
 * Script to update existing jobs in the database to reflect the new status logic:
 * - BOOKED jobs without a technician should be PENDING
 */
import { prisma } from '../src/prisma/prisma.client';

async function main() {
  console.log('Starting job status update...');

  // Find all BOOKED jobs without a technician assigned
  const bookedWithoutTech = await prisma.project.findMany({
    where: {
      status: 'BOOKED',
      technicianId: null,
    },
    select: {
      id: true,
      status: true,
      technicianId: true,
      createdAt: true,
    },
  });

  console.log(`Found ${bookedWithoutTech.length} BOOKED jobs without technician`);

  if (bookedWithoutTech.length > 0) {
    // Update them to PENDING
    const result = await prisma.project.updateMany({
      where: {
        status: 'BOOKED',
        technicianId: null,
      },
      data: {
        status: 'PENDING',
      },
    });

    console.log(`Updated ${result.count} jobs from BOOKED to PENDING`);
  }

  // Summary of current job statuses
  const statusCounts = await prisma.project.groupBy({
    by: ['status'],
    _count: {
      status: true,
    },
  });

  console.log('\nCurrent job status distribution:');
  for (const { status, _count } of statusCounts) {
    console.log(`  ${status}: ${_count.status}`);
  }

  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
