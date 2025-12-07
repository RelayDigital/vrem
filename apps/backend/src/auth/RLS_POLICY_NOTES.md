# Row-Level Security (RLS) Policy Notes

This document describes the intended RLS policies for the VREM database.
These policies are NOT currently enforced at the database level - they are
enforced in the application layer via the AuthorizationService.

When RLS is enabled in the future, these policies should be implemented
to provide defense-in-depth security.

## Prerequisites for RLS Implementation

1. Create an `app_user` database role (distinct from the service account)
2. Set up session variables for user context:
   - `app.current_user_id` - The authenticated user's ID
   - `app.current_org_id` - The active organization ID
   - `app.current_org_role` - The user's role in the active org

3. Configure Prisma to use the `app_user` role with session variables

## Entity Policies

### Organization

```sql
-- Users can see organizations they are members of
CREATE POLICY org_select ON "Organization"
  FOR SELECT
  USING (
    id IN (
      SELECT "orgId" FROM "OrganizationMember"
      WHERE "userId" = current_setting('app.current_user_id')
    )
  );

-- Only OWNER can update organization settings
CREATE POLICY org_update ON "Organization"
  FOR UPDATE
  USING (
    id = current_setting('app.current_org_id')::uuid
    AND current_setting('app.current_org_role') IN ('OWNER', 'ADMIN')
  );
```

### OrganizationMember

```sql
-- Users can see their own memberships
CREATE POLICY member_select ON "OrganizationMember"
  FOR SELECT
  USING (
    "userId" = current_setting('app.current_user_id')::uuid
    OR "orgId" = current_setting('app.current_org_id')::uuid
  );

-- Only OWNER/ADMIN can manage memberships
CREATE POLICY member_insert ON "OrganizationMember"
  FOR INSERT
  WITH CHECK (
    "orgId" = current_setting('app.current_org_id')::uuid
    AND current_setting('app.current_org_role') IN ('OWNER', 'ADMIN')
  );
```

### Project

```sql
-- Users can see projects in orgs they belong to
CREATE POLICY project_select ON "Project"
  FOR SELECT
  USING (
    "orgId" = current_setting('app.current_org_id')::uuid
  );

-- OWNER/ADMIN can edit any project; PROJECT_MANAGER only their assigned projects
CREATE POLICY project_update ON "Project"
  FOR UPDATE
  USING (
    "orgId" = current_setting('app.current_org_id')::uuid
    AND (
      current_setting('app.current_org_role') IN ('OWNER', 'ADMIN')
      OR (
        current_setting('app.current_org_role') = 'PROJECT_MANAGER'
        AND "projectManagerId" = current_setting('app.current_user_id')::uuid
      )
    )
  );

-- Only OWNER/ADMIN can delete projects
CREATE POLICY project_delete ON "Project"
  FOR DELETE
  USING (
    "orgId" = current_setting('app.current_org_id')::uuid
    AND current_setting('app.current_org_role') IN ('OWNER', 'ADMIN')
  );

-- OWNER/ADMIN/PROJECT_MANAGER can create projects
CREATE POLICY project_insert ON "Project"
  FOR INSERT
  WITH CHECK (
    "orgId" = current_setting('app.current_org_id')::uuid
    AND current_setting('app.current_org_role') IN ('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  );
```

### Message

```sql
-- Users can see messages for projects in their org
CREATE POLICY message_select ON "Message"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "projectId"
      AND p."orgId" = current_setting('app.current_org_id')::uuid
    )
  );

-- Team channel: any org member can write
-- Customer channel: only OWNER/ADMIN or assigned PROJECT_MANAGER
CREATE POLICY message_insert ON "Message"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "projectId"
      AND p."orgId" = current_setting('app.current_org_id')::uuid
    )
    AND (
      channel = 'TEAM'
      OR (
        channel = 'CUSTOMER'
        AND (
          current_setting('app.current_org_role') IN ('OWNER', 'ADMIN')
          OR EXISTS (
            SELECT 1 FROM "Project" p
            WHERE p.id = "projectId"
            AND p."projectManagerId" = current_setting('app.current_user_id')::uuid
          )
        )
      )
    )
  );
```

### OrganizationCustomer

```sql
-- Users can see customers in their org (if they have view permission)
CREATE POLICY customer_select ON "OrganizationCustomer"
  FOR SELECT
  USING (
    "orgId" = current_setting('app.current_org_id')::uuid
    AND current_setting('app.current_org_role') IN ('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  );

-- Only OWNER/ADMIN can manage customers
CREATE POLICY customer_modify ON "OrganizationCustomer"
  FOR ALL
  USING (
    "orgId" = current_setting('app.current_org_id')::uuid
    AND current_setting('app.current_org_role') IN ('OWNER', 'ADMIN')
  );
```

### Media

```sql
-- Users can see media for projects in their org
CREATE POLICY media_select ON "Media"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "projectId"
      AND p."orgId" = current_setting('app.current_org_id')::uuid
    )
  );

-- Users who can edit the project or are assigned can upload media
CREATE POLICY media_insert ON "Media"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "projectId"
      AND p."orgId" = current_setting('app.current_org_id')::uuid
      AND (
        current_setting('app.current_org_role') IN ('OWNER', 'ADMIN')
        OR p."projectManagerId" = current_setting('app.current_user_id')::uuid
        OR p."technicianId" = current_setting('app.current_user_id')::uuid
        OR p."editorId" = current_setting('app.current_user_id')::uuid
      )
    )
  );
```

### CalendarEvent

```sql
-- Users can see calendar events for projects in their org
CREATE POLICY calendar_select ON "CalendarEvent"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "projectId"
      AND p."orgId" = current_setting('app.current_org_id')::uuid
    )
  );
```

## Current Application-Layer Enforcement

Until RLS is enabled, the following services enforce these rules:

- **AuthorizationService** (`src/auth/authorization.service.ts`)
  - `canViewProject()` - Org membership check
  - `canEditProject()` - Admin or assigned PM check
  - `canDeleteProject()` - Admin only
  - `canChangeProjectCustomer()` - Admin only
  - `canManageCustomers()` - Admin only
  - `canWriteCustomerChat()` - Admin or assigned PM
  - `canWriteTeamChat()` - Any org member

- **ProjectsService** (`src/projects/projects.service.ts`)
  - All queries filter by `orgId = ctx.org.id`
  - Uses `ensureProjectInOrg()` for single-project operations

- **MessagesService** (`src/messages/messages.service.ts`)
  - Loads project with org check before message operations
  - Uses AuthorizationService for channel-specific permissions

- **CustomersService** (`src/customers/customers.service.ts`)
  - All queries filter by `orgId = ctx.org.id`
  - Uses `canManageCustomers()` for write operations

## Migration Path

1. Audit all queries to ensure org-scoping (DONE - all queries use ctx.org.id)
2. Add RLS policies to database (FUTURE)
3. Create app_user role with limited privileges (FUTURE)
4. Configure session variable injection in Prisma middleware (FUTURE)
5. Test thoroughly in staging environment (FUTURE)
6. Enable RLS in production (FUTURE)

## Notes

- The current code is structured to be RLS-ready
- All queries already include org-scoping
- Permission checks mirror what RLS policies would enforce
- When RLS is enabled, application-layer checks become redundant but provide defense-in-depth

