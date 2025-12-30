/**
 * Check real (non-test) Clerk accounts
 */

import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function main() {
  const users = await clerkClient.users.getUserList({ limit: 100 });

  // Filter out test accounts
  const realUsers = users.data.filter(
    (u) => !u.emailAddresses.some((e) => e.emailAddress.endsWith('@example.com'))
  );

  console.log('Real accounts:\n');
  for (const user of realUsers) {
    const email = user.emailAddresses[0]?.emailAddress || 'unknown';
    console.log('Email:', email);
    console.log('  ID:', user.id);
    console.log('  Has password:', user.passwordEnabled);
    console.log(
      '  External accounts:',
      user.externalAccounts.map((e) => e.provider).join(', ') || 'none'
    );
    console.log('');
  }
}

main().catch(console.error);
