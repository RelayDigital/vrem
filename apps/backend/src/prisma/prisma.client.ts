import { PrismaClient } from '@prisma/client';
import { buildPrismaClientOptions } from './prisma.client-config';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient(buildPrismaClientOptions());
  console.log('Instantiating PrismaClient for scripts/background jobs');
}

export const prisma = globalForPrisma.prisma;

export default prisma;
