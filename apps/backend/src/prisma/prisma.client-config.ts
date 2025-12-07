import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DEFAULT_CONNECTION_LIMIT = Number(process.env.PRISMA_CONNECTION_LIMIT ?? 5);

const safeConnectionLimit =
  Number.isFinite(DEFAULT_CONNECTION_LIMIT) && DEFAULT_CONNECTION_LIMIT > 0
    ? DEFAULT_CONNECTION_LIMIT
    : 5;

function buildConnectionStringWithLimit(rawUrl: string): string {
  const url = new URL(rawUrl);

  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', safeConnectionLimit.toString());
  }

  return url.toString();
}

export function buildPrismaClientOptions(): Prisma.PrismaClientOptions {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Please configure it for the PrismaPg adapter (Supabase direct URL).',
    );
  }

  try {
    const urlWithLimit = buildConnectionStringWithLimit(databaseUrl);
    const pool = new Pool({
      connectionString: urlWithLimit,
      ssl: {
        rejectUnauthorized: false, // Supabase requires SSL; allow provided CA
      },
    });

    return {
      adapter: new PrismaPg(pool),
    };
  } catch (error) {
    console.warn(
      'Unable to configure PrismaPg adapter with connection_limit; constructing without adapter override',
      error,
    );
    return {};
  }
}
