# Multi-Tenant Auth Test Checklist

Manual tests to verify Clerk + DB multi-tenant authentication.

## 1. First Login / User Provisioning

- [ ] **New Clerk user creates DB user + personal org**
  1. Sign up via Clerk (new email)
  2. Verify user created in `User` table with `clerkUserId`
  3. Verify `Organization` created with `type: PERSONAL`
  4. Verify `OrganizationMember` links user to personal org with `role: OWNER`
  5. Check `emailVerifiedAt` is set (Clerk OTP verified)
  6. Check `avatarUrl` synced from Clerk profile image

- [ ] **Race condition handling**
  1. Trigger multiple simultaneous requests with new Clerk token
  2. Verify only one user + personal org created (no duplicates)

## 2. Organization Switching

- [ ] **x-org-id header changes data context**
  1. User with multiple orgs logs in
  2. Switch org in UI (organization switcher)
  3. Verify `x-org-id` header changes in API requests
  4. Verify jobs/data shown matches active organization
  5. Verify localStorage `organizationId` persists across sessions

- [ ] **Invalid org access denied**
  1. Try to access org user is not member of
  2. Verify 403 Forbidden returned

## 3. Invitations

- [ ] **Invite existing user (in-app notification)**
  1. Create invitation for existing user's email
  2. Verify `Notification` created with `type: INVITATION_MEMBER` or `INVITATION_CUSTOMER`
  3. Verify notification appears in bell icon
  4. Accept invitation via notification
  5. Verify `OrganizationMember` created with correct role
  6. Verify invitation marked `ACCEPTED`

- [ ] **Invite new user (email sent)**
  1. Create invitation for email not in system
  2. Verify invitation email sent (check Resend logs or console in dev)
  3. Email contains signup link: `/signup?invite={token}`
  4. New user signs up with invite code
  5. Verify user added to invited org AND personal org created
  6. Verify invitation marked `ACCEPTED`

- [ ] **Customer invitations**
  1. Create customer invitation (`inviteType: CUSTOMER`)
  2. Accept invitation
  3. Verify `OrganizationCustomer` record created (not `OrganizationMember`)

## 4. Role-Based Permissions

- [ ] **Organization roles enforced**
  - `OWNER`: Can update settings, manage members, transfer ownership
  - `ADMIN`: Can update settings, manage members, cannot transfer ownership
  - `TECHNICIAN/EDITOR`: Limited to assigned work
  - `AGENT`: Customer-facing, limited org access

- [ ] **Personal org restrictions**
  - Cannot manually create `PERSONAL` type org
  - Cannot delete personal org
  - Name locked to `{User Name}'s Workspace`

## 5. Token Management

- [ ] **Clerk token refresh**
  1. Stay on app for 60+ seconds
  2. Verify token refreshes automatically (no 401 errors)
  3. Tab visibility change triggers refresh

- [ ] **Token expiry recovery**
  1. Simulate expired token (wait without tab focus)
  2. Verify retry logic fetches new token
  3. Request succeeds on retry

## 6. /auth/me Endpoint

- [ ] **Returns complete user data**
  ```json
  {
    "id": "...",
    "email": "...",
    "name": "...",
    "accountType": "PROVIDER|AGENT|COMPANY",
    "organizationId": "personal-org-id",
    "personalOrgId": "personal-org-id",
    "memberships": [
      { "orgId": "...", "role": "OWNER", "organization": {...} }
    ],
    "customerOrganizations": []  // For AGENT users
  }
  ```

## 7. Account Deactivation

- [ ] **Deactivated user cannot authenticate**
  1. Set `deactivatedAt` on user record
  2. Attempt login
  3. Verify 401 "Account has been deactivated" returned

## 8. Validation Endpoints

- [ ] **Invite code validation**
  1. `GET /organizations/invite/validate?token={token}`
  2. Valid pending invite returns org info
  3. Invalid/used token returns `{ valid: false }`

- [ ] **Pending invitations by email**
  1. `GET /organizations/invite/pending?email={email}`
  2. Returns all pending invitations for email

---

## Quick Smoke Test

1. Sign out completely
2. Sign up with new email via Clerk
3. Verify dashboard loads with personal org
4. Create a company org
5. Switch between orgs
6. Invite a teammate (test email)
7. Check invitation email/notification
8. Sign out and back in
9. Verify correct org restored from localStorage
