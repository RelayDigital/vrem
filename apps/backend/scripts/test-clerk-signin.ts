/**
 * Test Clerk sign-in to debug the needs_second_factor issue
 */

import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function main() {
  const email = 'agent@example.com';
  const password = 'password123';

  console.log(`🔐 Testing sign-in for: ${email}\n`);

  try {
    // First, let's check the Clerk instance settings
    // Unfortunately, Clerk doesn't expose all settings via API
    // But we can try to create a sign-in token directly

    // Get the user
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      console.log('❌ User not found in Clerk');
      return;
    }

    const user = users.data[0];
    console.log('User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Password enabled: ${user.passwordEnabled}`);
    console.log(`  2FA enabled: ${user.twoFactorEnabled}`);

    // Check the primary email
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    console.log(`  Email verified: ${primaryEmail?.verification?.status}`);

    // Try to verify the password directly
    console.log('\n🔑 Verifying password...');
    try {
      const verified = await clerkClient.users.verifyPassword({
        userId: user.id,
        password: password,
      });
      console.log(`  Password valid: ${verified.verified}`);
    } catch (pwErr: any) {
      console.log(`  Password verification error: ${pwErr.message}`);
    }

    // Get sign-in tokens (if any exist)
    console.log('\n📋 Checking active sessions...');
    const sessions = await clerkClient.sessions.getSessionList({
      userId: user.id,
    });
    console.log(`  Active sessions: ${sessions.data.length}`);

    // Try to create a sign-in token (backend-initiated sign-in)
    console.log('\n🎫 Creating sign-in token...');
    try {
      const signInToken = await clerkClient.signInTokens.createSignInToken({
        userId: user.id,
        expiresInSeconds: 60,
      });
      console.log(`  ✅ Sign-in token created successfully!`);
      console.log(`  Token: ${signInToken.token?.substring(0, 20)}...`);
      console.log('\n  This means the user CAN sign in via backend token.');
      console.log('  The issue is with the frontend Clerk.signIn flow requiring email verification.');
    } catch (tokenErr: any) {
      console.log(`  ❌ Sign-in token creation failed: ${tokenErr.message}`);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.errors) {
      console.error('Clerk errors:', error.errors);
    }
  }
}

main().catch(console.error);
