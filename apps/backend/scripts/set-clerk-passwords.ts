/**
 * Set passwords for Clerk accounts that don't have them.
 *
 * Usage:
 *   npx tsx scripts/set-clerk-passwords.ts
 */

import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const DEFAULT_PASSWORD = 'password123';

async function main() {
  console.log('🔐 Setting passwords for accounts without them...\n');

  const users = await clerkClient.users.getUserList({ limit: 100 });

  // Find users without passwords (excluding test accounts which should already have them)
  const usersWithoutPassword = users.data.filter((u) => !u.passwordEnabled);

  console.log(`Found ${usersWithoutPassword.length} account(s) without passwords\n`);

  for (const user of usersWithoutPassword) {
    const email = user.emailAddresses[0]?.emailAddress || 'unknown';

    try {
      console.log(`📧 ${email}`);
      console.log(`   Setting password...`);

      await clerkClient.users.updateUser(user.id, {
        password: DEFAULT_PASSWORD,
      });

      console.log(`   ✅ Password set to: ${DEFAULT_PASSWORD}`);
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Done!');
  console.log(`\nAccounts can now log in with password: ${DEFAULT_PASSWORD}`);
}

main().catch(console.error);
