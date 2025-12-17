# VREM API Reference

Complete API reference for testing all core endpoints.

**Base URL:** `http://localhost:3001`

**Authentication:** Most endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

**Organization Context:** Many endpoints require the `x-org-id` header:
```
x-org-id: <organization-id>
```

**Note for Agents:** Agents can access their own projects without the `x-org-id` header or organization membership. They can work with multiple organizations without being members of each one.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Organizations](#organizations)
3. [Projects](#projects)
4. [Dashboard](#dashboard)
5. [Media](#media)
6. [Messages](#messages)
7. [Users](#users)
8. [Inquiries](#inquiries)

---

## Authentication

### Register User

**POST** `/auth/register`

**Public endpoint** - No authentication required.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123",
  "accountType": "AGENT"
}
```

**Valid Account Types (self-serve):** `AGENT`, `PROVIDER`

**Example:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "name": "Agent User",
    "password": "password123",
    "accountType": "AGENT"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "agent@example.com",
    "name": "Agent User",
    "accountType": "AGENT",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### OAuth Login / Signup (Google, Facebook)

**POST** `/auth/oauth/google`

**POST** `/auth/oauth/facebook`

**Body:**
```json
{
  "token": "<google-id-token-or-facebook-access-token>",
  "accountType": "AGENT",
  "name": "Optional display name"
}
```

- Requires provider credentials (Google ID token or Facebook access token).
- `accountType` supports `AGENT` or `PROVIDER` for self-serve signup.
- Response shape matches `/auth/login` / `/auth/register`.

---

### Login

**POST** `/auth/login`

**Public endpoint** - No authentication required.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "agent@example.com",
    "name": "Agent User",
    "role": "AGENT"
  }
}
```

---

### Get Current User

**GET** `/auth/me`

**Requires:** JWT Authentication

**Example:**
```bash
TOKEN="your-jwt-token"

curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "AGENT",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Organizations

### List My Organizations

**GET** `/organizations`

**Requires:** JWT Authentication

Returns all organizations the current user is a member of.

**Example:**
```bash
TOKEN="your-jwt-token"

curl -X GET http://localhost:3001/organizations \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "member-id",
    "userId": "user-id",
    "orgId": "org-id",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "organization": {
      "id": "org-id",
      "name": "My Organization",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
]
```

---

### Get Organization by ID

**GET** `/organizations/:orgId`

**Requires:** 
- JWT Authentication
- Organization membership (OrgMemberGuard)
- `x-org-id` header

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"

curl -X GET "http://localhost:3001/organizations/$ORG_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID"
```

**Response:**
```json
{
  "id": "org-id",
  "name": "Organization Name",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "legalName": "Legal Name Inc.",
  "slug": "org-slug",
  "logoUrl": "https://...",
  "websiteUrl": "https://...",
  "phone": "+1234567890",
  "primaryEmail": "contact@org.com",
  "addressLine1": "123 Main St",
  "addressLine2": "Suite 100",
  "city": "City",
  "region": "State",
  "postalCode": "12345",
  "countryCode": "US",
  "timezone": "America/New_York",
  "serviceArea": {}
}
```

---

### Create Organization

**POST** `/organizations`

**Requires:** 
- JWT Authentication
- Global `ADMIN` role

**Request Body:**
```json
{
  "name": "New Organization"
}
```

**Example:**
```bash
TOKEN="admin-jwt-token"

curl -X POST http://localhost:3001/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Media Company"
  }'
```

---

### Update Organization Settings

**PATCH** `/organizations/:orgId/settings`

**Requires:**
- JWT Authentication
- Organization membership with `ADMIN` or `PROJECT_MANAGER` role
- `x-org-id` header

**Request Body:** (all fields optional)
```json
{
  "legalName": "Legal Name Inc.",
  "slug": "org-slug",
  "logoUrl": "https://...",
  "websiteUrl": "https://...",
  "phone": "+1234567890",
  "primaryEmail": "contact@org.com",
  "addressLine1": "123 Main St",
  "addressLine2": "Suite 100",
  "city": "City",
  "region": "State",
  "postalCode": "12345",
  "countryCode": "US",
  "timezone": "America/New_York",
  "serviceArea": {}
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"

curl -X PATCH "http://localhost:3001/organizations/$ORG_ID/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "Updated Legal Name",
    "phone": "+1987654321"
  }'
```

---

### Create Invite

**POST** `/organizations/:orgId/invite`

**Requires:**
- JWT Authentication
- Organization membership
- `x-org-id` header

**Request Body:**
```json
{
  "email": "invitee@example.com",
  "role": "TECHNICIAN"
}
```

**Valid OrgRoles:** `ADMIN`, `PROJECT_MANAGER`, `TECHNICIAN`, `EDITOR`, `AGENT`

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"

curl -X POST "http://localhost:3001/organizations/$ORG_ID/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "role": "TECHNICIAN"
  }'
```

---

### Accept Invite

**POST** `/organizations/accept-invite`

**Requires:** JWT Authentication

**Request Body:**
```json
{
  "token": "invitation-token"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:3001/organizations/accept-invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invitation-token-uuid"
  }'
```

---

## Projects

### List All Projects (Org-wide)

**GET** `/projects`

**Requires:**
- JWT Authentication
- Organization membership
- `ADMIN` or `PROJECT_MANAGER` role
- `x-org-id` header

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"

curl -X GET http://localhost:3001/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID"
```

**Response:**
```json
[
  {
    "id": "project-id",
    "agentId": "agent-id",
    "orgId": "org-id",
    "address": "123 Main St",
    "notes": "Project notes",
    "scheduledTime": "2024-01-15T10:00:00.000Z",
    "status": "BOOKED",
    "technicianId": null,
    "editorId": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "agent": { ... },
    "technician": null,
    "editor": null
  }
]
```

---

### List My Projects

**GET** `/projects/mine`

**Requires:**
- JWT Authentication
- `x-org-id` header (optional for AGENT role, required for other roles)

**Agent-Specific Behavior:**
- **AGENT without `x-org-id`**: Returns all projects where the user is the agent (across all organizations)
- **AGENT with `x-org-id`**: Returns projects where the user is the agent for that specific organization
- **AGENT**: Does not require organization membership

**Other Roles:**
- **TECHNICIAN**: Projects where user is the technician (requires org membership and `x-org-id`)
- **EDITOR**: Projects where user is the editor (requires org membership and `x-org-id`)
- **PROJECT_MANAGER/ADMIN**: All projects in the organization (requires org membership and `x-org-id`)

**Example (with org context):**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"

curl -X GET http://localhost:3001/projects/mine \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID"
```

**Example (agent without org context):**
```bash
TOKEN="agent-jwt-token"

# Returns all projects for this agent across all organizations
curl -X GET http://localhost:3001/projects/mine \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "project-id",
    "agentId": "agent-id",
    "orgId": "org-id",
    "address": "123 Main St",
    "notes": "Project notes",
    "scheduledTime": "2024-01-15T10:00:00.000Z",
    "status": "BOOKED",
    "technicianId": null,
    "editorId": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "media": [],
    "messages": [
      {
        "id": "message-id",
        "projectId": "project-id",
        "userId": "user-id",
        "content": "Message content",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "user": {
          "id": "user-id",
          "name": "User Name",
          "email": "user@example.com"
        }
      }
    ]
  }
]
```

---

### Get Project by ID

**GET** `/projects/:id`

**Requires:**
- JWT Authentication
- `x-org-id` header (optional for AGENT role if they own the project, required for other roles)

**Agent-Specific Behavior:**
- **AGENT**: Can access projects they own even without `x-org-id` header or org membership
- **AGENT**: If `x-org-id` is provided, validates project belongs to that org

**Other Roles:**
- Requires organization membership
- Requires `x-org-id` header

**Example (with org context):**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X GET "http://localhost:3001/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID"
```

**Example (agent without org context):**
```bash
TOKEN="agent-jwt-token"
PROJECT_ID="project-id-here"

# Agent can access their own projects without org context
curl -X GET "http://localhost:3001/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "project-id",
  "agentId": "agent-id",
  "orgId": "org-id",
  "address": "123 Main St",
  "notes": "Project notes",
  "scheduledTime": "2024-01-15T10:00:00.000Z",
  "status": "BOOKED",
  "technicianId": null,
  "editorId": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "agent": { ... },
  "technician": null,
  "editor": null,
  "media": [],
  "messages": []
}
```

---

### Create Project

**POST** `/projects/create`

**Requires:**
- JWT Authentication
- `AGENT` or `PROJECT_MANAGER` role
- Organization ID (via `x-org-id` header or `orgId` in request body)

**Agent-Specific Behavior:**
- **AGENT**: Does not require organization membership
- **AGENT**: Can provide `orgId` in request body or via `x-org-id` header
- **AGENT**: `agentId` is automatically set to the current user's ID (can be omitted)
- **AGENT**: Organization must exist, but agent doesn't need to be a member

**PROJECT_MANAGER:**
- Requires organization membership
- Requires `x-org-id` header

**Request Body:**
```json
{
  "agentId": "agent-id",
  "orgId": "org-id-here",
  "address": "123 Main St",
  "notes": "Project notes",
  "scheduledTime": "2024-01-15T10:00:00.000Z"
}
```

**Note:** 
- If user role is `AGENT`, `agentId` is automatically set to the current user's ID (can be omitted)
- `orgId` is optional in body if `x-org-id` header is provided
- `orgId` is required in body if `x-org-id` header is not provided

**Example (agent with orgId in body):**
```bash
TOKEN="agent-jwt-token"

curl -X POST http://localhost:3001/projects/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org-id-here",
    "address": "456 Oak Avenue",
    "notes": "3-bedroom house shoot",
    "scheduledTime": "2024-01-20T14:00:00.000Z"
  }'
```

**Example (agent with x-org-id header):**
```bash
TOKEN="agent-jwt-token"
ORG_ID="org-id-here"

curl -X POST http://localhost:3001/projects/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "456 Oak Avenue",
    "notes": "3-bedroom house shoot",
    "scheduledTime": "2024-01-20T14:00:00.000Z"
  }'
```

**Example (project manager - requires membership):**
```bash
TOKEN="pm-jwt-token"
ORG_ID="org-id-here"

curl -X POST http://localhost:3001/projects/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-id",
    "address": "456 Oak Avenue",
    "notes": "3-bedroom house shoot",
    "scheduledTime": "2024-01-20T14:00:00.000Z"
  }'
```

---

### Update Project

**PATCH** `/projects/:id`

**Requires:**
- JWT Authentication
- Organization membership
- `PROJECT_MANAGER` or `ADMIN` role
- `x-org-id` header

**Request Body:** (all fields optional)
```json
{
  "address": "Updated address",
  "notes": "Updated notes",
  "scheduledTime": "2024-01-25T10:00:00.000Z"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X PATCH "http://localhost:3001/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "789 Pine Street",
    "notes": "Updated project notes"
  }'
```

---

### Delete Project

**DELETE** `/projects/:id`

**Requires:**
- JWT Authentication
- Organization membership
- `PROJECT_MANAGER` or `ADMIN` role
- `x-org-id` header

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X DELETE "http://localhost:3001/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID"
```

---

### Assign Agent

**PATCH** `/projects/:id/assign-agent`

**Requires:**
- JWT Authentication
- Organization membership
- `ADMIN` or `PROJECT_MANAGER` role
- `x-org-id` header

**Request Body:**
```json
{
  "agentId": "new-agent-id"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X PATCH "http://localhost:3001/projects/$PROJECT_ID/assign-agent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "new-agent-user-id"
  }'
```

---

### Assign Technician

**PATCH** `/projects/:id/assign-technician`

**Requires:**
- JWT Authentication
- Organization membership
- `ADMIN` or `PROJECT_MANAGER` role
- `x-org-id` header

**Request Body:**
```json
{
  "technicianId": "technician-id"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X PATCH "http://localhost:3001/projects/$PROJECT_ID/assign-technician" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "technicianId": "technician-user-id"
  }'
```

---

### Assign Editor

**PATCH** `/projects/:id/assign-editor`

**Requires:**
- JWT Authentication
- Organization membership
- `ADMIN` or `PROJECT_MANAGER` role
- `x-org-id` header

**Request Body:**
```json
{
  "editorId": "editor-id"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X PATCH "http://localhost:3001/projects/$PROJECT_ID/assign-editor" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "editorId": "editor-user-id"
  }'
```

---

### Assign Technician and Editor

**PATCH** `/projects/:id/assign`

**Requires:**
- JWT Authentication
- Organization membership
- `PROJECT_MANAGER` or `ADMIN` role
- `x-org-id` header

**Request Body:**
```json
{
  "technicianId": "technician-id",
  "editorId": "editor-id"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X PATCH "http://localhost:3001/projects/$PROJECT_ID/assign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "technicianId": "technician-user-id",
    "editorId": "editor-user-id"
  }'
```

---

### Schedule Project

**PATCH** `/projects/:id/schedule`

**Requires:**
- JWT Authentication
- Organization membership
- `ADMIN` or `PROJECT_MANAGER` role
- `x-org-id` header

**Request Body:**
```json
{
  "scheduledTime": "2024-01-25T14:00:00.000Z"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X PATCH "http://localhost:3001/projects/$PROJECT_ID/schedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledTime": "2024-01-25T14:00:00.000Z"
  }'
```

---

### Update Project Status

**PATCH** `/projects/:id/status`

**Requires:**
- JWT Authentication
- Organization membership
- `x-org-id` header

**Status Transitions:**
- **PM/Admin**: Can set any status
- **Technician**: `BOOKED` → `SHOOTING` → `EDITING`
- **Editor**: `EDITING` → `DELIVERED`

**Valid Statuses:** `BOOKED`, `SHOOTING`, `EDITING`, `DELIVERED`

**Request Body:**
```json
{
  "status": "SHOOTING"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X PATCH "http://localhost:3001/projects/$PROJECT_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SHOOTING"
  }'
```

---

### Get Project Messages

**GET** `/projects/:id/messages`

**Requires:**
- JWT Authentication
- `AGENT`, `TECHNICIAN`, `EDITOR`, `PROJECT_MANAGER`, or `ADMIN` role
- `x-org-id` header (optional for AGENT role if they own the project, required for other roles)

**Agent-Specific Behavior:**
- **AGENT**: Can access messages for projects they own even without `x-org-id` header or org membership

**Other Roles:**
- Requires organization membership
- Requires `x-org-id` header

**Example (with org context):**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X GET "http://localhost:3001/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID"
```

**Example (agent without org context):**
```bash
TOKEN="agent-jwt-token"
PROJECT_ID="project-id-here"

# Agent can access messages for their own projects without org context
curl -X GET "http://localhost:3001/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "message-id",
    "projectId": "project-id",
    "userId": "user-id",
    "content": "Message content",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "user-id",
      "name": "User Name",
      "email": "user@example.com"
    }
  }
]
```

---

### Add Project Message

**POST** `/projects/:id/messages`

**Requires:**
- JWT Authentication
- `AGENT`, `TECHNICIAN`, `EDITOR`, `PROJECT_MANAGER`, or `ADMIN` role
- `x-org-id` header (optional for AGENT role if they own the project, required for other roles)

**Agent-Specific Behavior:**
- **AGENT**: Can add messages to projects they own even without `x-org-id` header or org membership

**Other Roles:**
- Requires organization membership
- Requires `x-org-id` header

**Request Body:**
```json
{
  "content": "Message content here"
}
```

**Example (with org context):**
```bash
TOKEN="your-jwt-token"
ORG_ID="org-id-here"
PROJECT_ID="project-id-here"

curl -X POST "http://localhost:3001/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a project message"
  }'
```

**Example (agent without org context):**
```bash
TOKEN="agent-jwt-token"
PROJECT_ID="project-id-here"

# Agent can add messages to their own projects without org context
curl -X POST "http://localhost:3001/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a project message"
  }'
```

---

## Dashboard

### Get Dashboard Data

**GET** `/dashboard`

**Requires:** JWT Authentication

Returns dashboard data for the current user based on their role.

**Example:**
```bash
TOKEN="your-jwt-token"

curl -X GET http://localhost:3001/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "projects": [ ... ],
  "technicians": [ ... ],
  "auditLog": [ ... ],
  "metrics": {
    "organizationId": "org-id",
    "period": "week",
    "jobs": {
      "total": 10,
      "pending": 2,
      "assigned": 3,
      "completed": 5,
      "cancelled": 0
    },
    "technicians": {
      "active": 5,
      "available": 3,
      "utilization": 0.6
    },
    "technicians": {
      "active": 5,
      "available": 3,
      "utilization": 0.6
    },
    "performance": {
      "averageAssignmentTime": 30,
      "averageDeliveryTime": 48,
      "onTimeRate": 0.9,
      "clientSatisfaction": 4.7
    },
    "revenue": {
      "total": 10000,
      "perJob": 1000
    }
  }
}
```

---

## Media

### Confirm Media Upload

**POST** `/media/confirm-upload`

**Requires:** JWT Authentication (may vary)

**Request Body:**
```json
{
  "key": "s3-key",
  "projectId": "project-id",
  "filename": "image.jpg",
  "size": 1024000,
  "type": "PHOTO",
  "cdnUrl": "https://cdn.example.com/image.jpg"
}
```

**Valid MediaTypes:** `PHOTO`, `VIDEO`, `FLOORPLAN`, `DOCUMENT`

**Example:**
```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:3001/media/confirm-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "projects/project-id/image.jpg",
    "projectId": "project-id",
    "filename": "image.jpg",
    "size": 1024000,
    "type": "PHOTO",
    "cdnUrl": "https://cdn.example.com/image.jpg"
  }'
```

---

### Get Media for Project

**GET** `/media/project/:projectId`

**Requires:** JWT Authentication (may vary)

**Example:**
```bash
TOKEN="your-jwt-token"
PROJECT_ID="project-id-here"

curl -X GET "http://localhost:3001/media/project/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "media-id",
    "projectId": "project-id",
    "key": "s3-key",
    "cdnUrl": "https://cdn.example.com/image.jpg",
    "filename": "image.jpg",
    "size": 1024000,
    "type": "PHOTO",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Get Media by ID

**GET** `/media/:id`

**Requires:** JWT Authentication (may vary)

**Example:**
```bash
TOKEN="your-jwt-token"
MEDIA_ID="media-id-here"

curl -X GET "http://localhost:3001/media/$MEDIA_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Delete Media

**DELETE** `/media/:id`

**Requires:** JWT Authentication (may vary)

**Example:**
```bash
TOKEN="your-jwt-token"
MEDIA_ID="media-id-here"

curl -X DELETE "http://localhost:3001/media/$MEDIA_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Messages

### Send Message

**POST** `/messages`

**Requires:** JWT Authentication

**Request Body:**
```json
{
  "projectId": "project-id",
  "content": "Message content"
}
```

**Example:**
```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:3001/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-id",
    "content": "Hello, this is a message"
  }'
```

---

### Get Messages for Project

**GET** `/messages/project/:projectId`

**Requires:** JWT Authentication

**Example:**
```bash
TOKEN="your-jwt-token"
PROJECT_ID="project-id-here"

curl -X GET "http://localhost:3001/messages/project/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Get Message by ID

**GET** `/messages/:id`

**Requires:** JWT Authentication

**Example:**
```bash
TOKEN="your-jwt-token"
MESSAGE_ID="message-id-here"

curl -X GET "http://localhost:3001/messages/$MESSAGE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Quick Test Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3001"
EMAIL="test@example.com"
PASSWORD="password123"

echo "=== VREM API Test ==="
echo ""

# Login
echo "1. Logging in..."
RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Get user info
echo "2. Getting current user..."
curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# List organizations
echo "3. Listing organizations..."
ORG_LIST=$(curl -s -X GET "$API_URL/organizations" \
  -H "Authorization: Bearer $TOKEN")

echo "$ORG_LIST" | jq '.'
ORG_ID=$(echo "$ORG_LIST" | jq -r '.[0].orgId // .[0].organization.id // empty' 2>/dev/null)
echo ""

if [ -n "$ORG_ID" ] && [ "$ORG_ID" != "null" ]; then
  echo "4. Getting organization: $ORG_ID"
  curl -s -X GET "$API_URL/organizations/$ORG_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-org-id: $ORG_ID" | jq '.'
  echo ""

  echo "5. Listing projects..."
  curl -s -X GET "$API_URL/projects/mine" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-org-id: $ORG_ID" | jq '.'
  echo ""

  echo "6. Getting dashboard..."
  curl -s -X GET "$API_URL/dashboard" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
else
  echo "⚠️  No organization found. Skipping org-scoped endpoints."
fi

echo ""
echo "=== Test Complete ==="
```

Make it executable:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You do not belong to this organization"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Organization not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All UUIDs are standard UUID v4 format
- The `x-org-id` header is required for most project and organization endpoints
- **Agent Exception**: Agents can access their own projects without `x-org-id` header or organization membership
- **Agent Projects**: Agents can create projects for organizations they're not members of by providing `orgId` in request body or `x-org-id` header
- Role-based access control (RBAC) is enforced on most endpoints
- Project status transitions are validated based on user role
- Organization membership is checked via `OrgMemberGuard` on protected endpoints (except for agents accessing their own projects)
