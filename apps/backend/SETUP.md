# Backend Setup + User Creation Guide

This guide documents the complete process for bringing up the backend from a fresh clone and creating a working user through the CLI.

## 1. Requirements

The following tools are required:

- **Node.js** (v18 or higher) & **npm**
- **PostgreSQL** (via Postgres.app or Supabase)
- **Supabase connection string** (`DATABASE_URL`)
- **Environment variables** for backend configuration
- **NestJS CLI** (optional, for generating modules)

## 2. Installing Dependencies

Navigate to the backend directory and install dependencies:

```bash
cd apps/backend
npm install
```

## 3. Environment Configuration

Create a `.env` file inside `apps/backend` with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Authentication
JWT_SECRET="dev_auth_key"

# Server Configuration
PORT=3001

# Supabase Configuration (Optional - for media storage)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Cronofy Configuration (Optional - for calendar integration)
CRONOFY_ACCESS_TOKEN="your-cronofy-access-token"

# CDN Configuration (Optional - for media CDN)
UPLOADCARE_CDN_BASE="https://ucarecdn.com"
```

**Note:** The backend listens on port 3001 by default.

## 4. Prisma Setup

Follow this sequence to set up Prisma:

### 4.1 Validate Database Connection

Pull the existing schema from your Supabase database:

```bash
npx prisma db pull
```

### 4.2 Generate Prisma Client

Generate the Prisma Client based on your schema:

```bash
npx prisma generate
```

### 4.3 Apply Migrations

Deploy migrations to sync Prisma with the existing Supabase schema:

```bash
npx prisma migrate deploy
```

This syncs Prisma with the existing Supabase schema without resetting data.

## 5. Running the Backend

Start the backend in development mode:

```bash
npm run start:dev
```

Expected logs should show:

- Module initialization messages
- Prisma connecting to the database
- "Nest application successfully started"
- Server listening on port 3001

## 6. Verifying the API from CLI

### 6.1 Test Root Endpoint

Verify the server is running:

```bash
curl -i http://localhost:3001
```

Should return:

```
HTTP/1.1 401 Unauthorized
{"message":"Unauthorized"}
```

### 6.2 Register a User

Create a new user account:

```bash
curl -i -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com", "name":"Agent", "password":"password123", "role":"AGENT"}'
```

Valid roles are: `ADMIN`, `PROJECT_MANAGER`, `TECHNICIAN`, `EDITOR`, `AGENT`

### 6.3 Login

Authenticate with the created user:

```bash
curl -i -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com", "password":"password123"}'
```

Response includes user data and JWT token:

```json
{
  "user": {
    "id": "...",
    "email": "agent@example.com",
    "name": "Agent",
    "role": "AGENT",
    "createdAt": "..."
  },
  "token": "eyJhbGc..."
}
```

## 7. Testing /auth/me

Verify authentication by accessing the protected endpoint:

```bash
TOKEN="paste-token-here"

curl -i http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Expected response: `200 OK` with user JSON (password excluded).

## 8. Summary

Complete setup process:

1. **Install dependencies:** `cd apps/backend && npm install`
2. **Set environment variables:** Create `.env` with `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, and optional service keys
3. **Run Prisma:** `npx prisma db pull`, `npx prisma generate`, `npx prisma migrate deploy`
4. **Start backend:** `npm run start:dev`
5. **Create user:** POST to `/auth/register` with email, name, password, and role
6. **Authenticate:** POST to `/auth/login` with email and password to receive token
7. **Verify:** GET `/auth/me` with `Authorization: Bearer <token>` header
