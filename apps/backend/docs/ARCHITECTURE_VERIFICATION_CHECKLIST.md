# Architecture Verification Checklist

This checklist validates that the VREM app follows the correct architecture:
- **Clerk**: Authentication ONLY (JWT tokens)
- **Postgres**: Source of truth for users, orgs, memberships, roles
- **No Clerk org sync**: Organizations exist only in Postgres

---

## 1. User Provisioning (Idempotent)

### Test: Repeated API calls don't create duplicate users

```bash
# Get a valid Clerk token (from browser dev tools or Clerk dashboard)
TOKEN="your_clerk_jwt_token"

# Call /auth/me multiple times - should return same user each time
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/auth/me | jq '.id'
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/auth/me | jq '.id'
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/auth/me | jq '.id'

# All three should return the same user ID
```

**Expected**: Same user ID returned every time, no duplicate users created.

**Verify in DB**:
```sql
-- Check for duplicate clerkUserId entries
SELECT "clerkUserId", COUNT(*)
FROM "User"
WHERE "clerkUserId" IS NOT NULL
GROUP BY "clerkUserId"
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

## 2. Organization Access Control

### Test: 403 when accessing org user doesn't belong to

```bash
TOKEN="your_clerk_jwt_token"
WRONG_ORG_ID="uuid-of-org-user-doesnt-belong-to"

# Should return 403 Forbidden
curl -H "Authorization: Bearer $TOKEN" \
     -H "x-org-id: $WRONG_ORG_ID" \
     http://localhost:4000/jobs
```

**Expected**: HTTP 403 with message about org access.

### Test: 400 when x-org-id missing on org-required routes

```bash
TOKEN="your_clerk_jwt_token"

# Should return 400 Bad Request (missing org context)
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/jobs
```

**Expected**: HTTP 400 with message about missing organization context.

### Test: Valid org access works

```bash
TOKEN="your_clerk_jwt_token"
VALID_ORG_ID="uuid-of-org-user-belongs-to"

# Should return 200 with jobs list
curl -H "Authorization: Bearer $TOKEN" \
     -H "x-org-id: $VALID_ORG_ID" \
     http://localhost:4000/jobs
```

**Expected**: HTTP 200 with jobs array.

---

## 3. Personal Organization Handling

### Test: New user gets personal org created automatically

1. Create a new Clerk user (via Clerk dashboard or sign-up flow)
2. Call `/auth/me` with their token
3. Check response includes:
   - `memberships` array with at least one entry
   - One org with `type: "PERSONAL"`
   - `personalOrgId` field populated

**Verify in DB**:
```sql
-- For a specific user, check personal org exists
SELECT o.id, o."name", o."type", om."role"
FROM "Organization" o
JOIN "OrganizationMember" om ON om."orgId" = o.id
JOIN "User" u ON u.id = om."userId"
WHERE u."clerkUserId" = 'clerk_user_id_here'
  AND o."type" = 'PERSONAL';
-- Should return exactly 1 row
```

---

## 4. Agent as Customer Flow

### Test: Agent can be added as customer to Provider/Company org

1. Login as Provider or Company account
2. Navigate to Customers section
3. Add an existing Agent user as a customer
4. Verify the Agent appears in customer list

**Verify in DB**:
```sql
-- Check OrganizationCustomer relationship exists
SELECT oc.*, u.email, u."accountType", o."name" as org_name
FROM "OrganizationCustomer" oc
JOIN "User" u ON u.id = oc."userId"
JOIN "Organization" o ON o.id = oc."orgId"
WHERE u."accountType" = 'AGENT';
```

### Test: Agent can see orgs where they're a customer

```bash
TOKEN="agent_user_token"

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/auth/me | jq '.customerOrganizations'
```

**Expected**: Array of organizations where agent is a customer.

---

## 5. Token Refresh Flow

### Test: Expired token triggers refresh

1. Open browser dev tools Network tab
2. Login to the app
3. Wait 30+ seconds (token refresh interval)
4. Perform any action that makes an API call
5. Check that no 401 errors appear in console

**Expected**: Token refreshes silently, no user-facing errors.

### Test: Tab visibility triggers token refresh

1. Login to the app
2. Switch to another browser tab
3. Wait 2+ minutes
4. Switch back to the VREM tab
5. Perform any action

**Expected**: Token refreshes on tab visibility change, no auth errors.

---

## 6. Organization Switching

### Test: Switching orgs updates x-org-id header

1. Login to the app
2. Open browser dev tools Network tab
3. Switch organizations via the org switcher
4. Make an API call (e.g., view jobs)
5. Inspect the request headers

**Expected**: `x-org-id` header matches the selected organization.

### Test: localStorage persists selected org

1. Login and switch to a non-personal org
2. Refresh the page
3. Check that the same org is still selected

**Verify in localStorage**:
```javascript
localStorage.getItem('organizationId')
// Should match the org you selected
```

---

## 7. Role-Based Access

### Test: Different roles see appropriate content

| Role | Expected Access |
|------|----------------|
| OWNER | Full org management, can delete org |
| ADMIN | Can manage members, cannot delete org |
| TECHNICIAN | Can view/update assigned jobs only |
| EDITOR | Can edit projects and jobs |
| PROJECT_MANAGER | Can manage projects |
| AGENT | Agent-specific access |

For each role:
1. Login as user with that role
2. Verify menu items match expected access
3. Verify API calls for restricted actions return 403

---

## 8. accountType vs orgRole Distinction

### Verify: accountType determines relationship table

```sql
-- AGENT/PROVIDER/COMPANY users should be in OrganizationMember
SELECT u.email, u."accountType", om."role"
FROM "User" u
JOIN "OrganizationMember" om ON om."userId" = u.id
WHERE u."accountType" IN ('AGENT', 'PROVIDER', 'COMPANY');

-- AGENT users can ALSO be in OrganizationCustomer (when invited by Provider/Company)
SELECT u.email, u."accountType", oc."orgId"
FROM "User" u
JOIN "OrganizationCustomer" oc ON oc."userId" = u.id
WHERE u."accountType" = 'AGENT';
```

### Verify: orgRole determines permissions within org

```sql
-- Check roles are properly assigned
SELECT u.email, o."name", om."role"
FROM "OrganizationMember" om
JOIN "User" u ON u.id = om."userId"
JOIN "Organization" o ON o.id = om."orgId"
ORDER BY o."name", om."role";
```

---

## 9. Frontend Consistency Checks

### Check: All API calls include x-org-id when needed

In browser dev tools, filter Network requests to your API domain and verify:
- All `/jobs/*` requests have `x-org-id` header
- All `/projects/*` requests have `x-org-id` header
- All `/organizations/:id/*` requests have `x-org-id` header
- `/auth/me` does NOT require `x-org-id`

### Check: Auth context properly syncs with Clerk

1. Open React DevTools
2. Find AuthContext provider
3. Verify:
   - `user` is populated after login
   - `memberships` array is populated
   - `activeOrganizationId` matches localStorage
   - `token` is a valid JWT

---

## 10. Error Handling

### Test: Network errors don't corrupt state

1. Open the app and login
2. Disconnect from network (browser offline mode)
3. Try to perform actions
4. Reconnect to network
5. Verify app recovers gracefully

### Test: 401 triggers silent token refresh

1. In backend, temporarily shorten JWT expiry to 10 seconds
2. Login and wait for token to expire
3. Perform an action
4. Verify the action succeeds (token was refreshed)

---

## Quick Validation Script

Run this from the backend directory to check for common issues:

```bash
npx tsx scripts/check-architecture.ts
```

Create this script:

```typescript
// scripts/check-architecture.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Architecture Validation\n');

  // 1. Check for duplicate clerkUserIds
  const dupes = await prisma.$queryRaw`
    SELECT "clerkUserId", COUNT(*) as count
    FROM "User"
    WHERE "clerkUserId" IS NOT NULL
    GROUP BY "clerkUserId"
    HAVING COUNT(*) > 1
  `;
  console.log('Duplicate clerkUserIds:', Array.isArray(dupes) && dupes.length === 0 ? '✅ None' : dupes);

  // 2. Check all users have personal org
  const usersWithoutPersonalOrg = await prisma.$queryRaw`
    SELECT u.id, u.email
    FROM "User" u
    WHERE NOT EXISTS (
      SELECT 1 FROM "OrganizationMember" om
      JOIN "Organization" o ON o.id = om."orgId"
      WHERE om."userId" = u.id AND o."type" = 'PERSONAL'
    )
  `;
  console.log('Users without personal org:',
    Array.isArray(usersWithoutPersonalOrg) && usersWithoutPersonalOrg.length === 0
      ? '✅ All have personal orgs'
      : usersWithoutPersonalOrg
  );

  // 3. Check org members have valid roles
  const invalidRoles = await prisma.$queryRaw`
    SELECT om.*, u.email
    FROM "OrganizationMember" om
    JOIN "User" u ON u.id = om."userId"
    WHERE om."role" NOT IN ('OWNER', 'ADMIN', 'TECHNICIAN', 'DISPATCHER', 'VIEWER')
  `;
  console.log('Invalid org roles:',
    Array.isArray(invalidRoles) && invalidRoles.length === 0
      ? '✅ All valid'
      : invalidRoles
  );

  // 4. Summary counts
  const userCount = await prisma.user.count();
  const orgCount = await prisma.organization.count();
  const membershipCount = await prisma.organizationMember.count();
  const customerCount = await prisma.organizationCustomer.count();

  console.log('\n📊 Summary:');
  console.log(`  Users: ${userCount}`);
  console.log(`  Organizations: ${orgCount}`);
  console.log(`  Memberships: ${membershipCount}`);
  console.log(`  Customer relationships: ${customerCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Summary

| Check | How to Verify |
|-------|---------------|
| Idempotent provisioning | Call /auth/me multiple times, same user ID |
| Org access control | 403 for wrong org, 400 for missing org |
| Personal org creation | New users get personal org automatically |
| Agent as customer | Agent can be in OrganizationCustomer |
| Token refresh | No 401 errors during normal usage |
| Org switching | x-org-id header updates correctly |
| Role-based access | Menu/API restricted by orgRole |
| accountType vs orgRole | accountType for table, orgRole for permissions |
