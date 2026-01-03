# Public MVP Smoke Test Checklist

This document provides instructions for running automated smoke tests and a manual verification checklist for the public MVP.

## Quick Start

```bash
# Run automated smoke tests against local server
cd apps/backend
npm run test:smoke

# Run standalone smoke runner against any environment
npx ts-node test/smoke/smoke-runner.ts http://localhost:3001
npx ts-node test/smoke/smoke-runner.ts https://api.staging.vrem.app
```

---

## Environment Setup

### Required Environment Variables

For the backend server to function properly, these environment variables must be set:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk authentication secret key |
| `JWT_SECRET` | Prod only | Secret for signing JWT tokens |
| `FRONTEND_URL` | Prod only | Frontend URL for CORS and email links |

### Storage (for artifact download)

| Variable | Required | Description |
|----------|----------|-------------|
| `UPLOADCARE_PUBLIC_KEY` | Prod only | Uploadcare public key for uploads |
| `UPLOADCARE_PRIVATE_KEY` | Prod only | Uploadcare private key for file ops |
| `UPLOADCARE_CDN_BASE` | Prod only | CDN base URL (e.g., `https://ucarecdn.com`) |

### Email (for notifications)

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Prod only | Resend API key for sending emails |
| `EMAIL_FROM` | No | From address (default: `VREM <noreply@vrem.app>`) |

### Optional

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | No | Stripe secret (if using payments) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook secret |
| `INTERNAL_API_TOKEN` | No | Token for internal/cron endpoints |

---

## Provider Setup Steps

### 1. Database Setup

```bash
# Local development with Docker
docker run -d \
  --name vrem-postgres \
  -e POSTGRES_USER=vrem \
  -e POSTGRES_PASSWORD=vrem \
  -e POSTGRES_DB=vrem \
  -p 5432:5432 \
  postgres:15

# Set DATABASE_URL
export DATABASE_URL="postgresql://vrem:vrem@localhost:5432/vrem"

# Run migrations
cd apps/backend
npx prisma migrate deploy
```

### 2. Clerk Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or select existing
3. Go to **API Keys**
4. Copy the **Secret Key** (starts with `sk_`)
5. Set `CLERK_SECRET_KEY=sk_...`

### 3. Uploadcare Setup (for downloads)

1. Go to [Uploadcare Dashboard](https://uploadcare.com/dashboard)
2. Create a new project or select existing
3. Go to **API keys**
4. Copy **Public key** and **Secret key**
5. Set environment variables:
   ```bash
   export UPLOADCARE_PUBLIC_KEY="..."
   export UPLOADCARE_PRIVATE_KEY="..."
   export UPLOADCARE_CDN_BASE="https://ucarecdn.com"
   ```

### 4. Resend Setup (for emails)

1. Go to [Resend Dashboard](https://resend.com)
2. Create an API key
3. Set `RESEND_API_KEY=re_...`
4. Verify your sending domain

---

## Running Automated Smoke Tests

### Option 1: Jest Test Suite (Full E2E)

Runs tests using NestJS test module with full cleanup:

```bash
cd apps/backend

# Run smoke tests
npm run test:smoke

# Run with verbose output
npm run test:smoke -- --verbose

# Run specific test
npm run test:smoke -- -t "User Sign Up"
```

### Option 2: Standalone HTTP Runner

Runs against any live server using HTTP requests:

```bash
cd apps/backend

# Against local
npx ts-node test/smoke/smoke-runner.ts http://localhost:3001

# Against staging
npx ts-node test/smoke/smoke-runner.ts https://api.staging.example.com

# With custom timeout
SMOKE_TEST_TIMEOUT=120000 npx ts-node test/smoke/smoke-runner.ts
```

---

## Manual Verification Checklist

Use this checklist for manual testing when automated tests pass but you want to verify UI flows.

### Pre-flight Checks

- [ ] Backend server is running (`npm run start:dev` in `apps/backend`)
- [ ] Frontend is running (`npm run dev` in `apps/frontend`)
- [ ] Database is accessible and migrations applied
- [ ] `.env` file has all required variables

### Sign Up Flow

- [ ] Navigate to `/signup`
- [ ] Select account type (Agent or Provider)
- [ ] Enter email, name, password
- [ ] Submit form
- [ ] Verify redirect to dashboard
- [ ] Verify personal organization is shown in org switcher

### Project Creation

- [ ] Navigate to projects page
- [ ] Click "New Project" or equivalent
- [ ] Fill in address details
- [ ] Set scheduled time
- [ ] Submit form
- [ ] Verify project appears in list

### Media Upload

- [ ] Open project detail page
- [ ] Upload a photo (JPG/PNG)
- [ ] Upload a video (MP4)
- [ ] Verify files appear in media gallery
- [ ] Verify thumbnails load correctly

### Enable Delivery

- [ ] Click "Enable Delivery" or equivalent
- [ ] Verify delivery link is generated
- [ ] Copy delivery link
- [ ] Verify link is accessible in incognito/private window

### Public Delivery Page

- [ ] Open delivery link in new browser/incognito
- [ ] Verify project details are visible
- [ ] Verify media items are displayed
- [ ] Verify organization branding appears

### Download Flow

- [ ] Click "Download All" on delivery page
- [ ] Wait for artifact generation
- [ ] Verify download completes (if Uploadcare configured)
- [ ] Verify ZIP contains uploaded files

### Comment & Approval (Customer Flow)

- [ ] Log in as customer user
- [ ] Navigate to delivery page
- [ ] Add a comment
- [ ] Verify comment appears
- [ ] Click "Approve"
- [ ] Verify approval status updates

---

## Troubleshooting

### Common Issues

#### "Database connection failed"
- Check `DATABASE_URL` is correct
- Verify PostgreSQL is running
- Check network/firewall rules

#### "Unauthorized" errors
- Verify `CLERK_SECRET_KEY` is set
- Check JWT token is valid
- Verify user has correct role

#### "Delivery not found"
- Ensure delivery is enabled on project
- Check delivery token matches
- Verify project exists in database

#### Download stuck in "GENERATING"
- Check `UPLOADCARE_*` variables are set
- Verify Uploadcare credentials are valid
- Check artifact worker is running (logs for `ArtifactWorkerService`)

#### Rate limiting errors
- Reduce test frequency
- Use different IP for parallel tests
- Check `@Throttle` limits in controllers

### Debug Mode

Run backend with debug logging:

```bash
DEBUG=* npm run start:dev
```

Check specific service logs:

```bash
# In backend logs, look for:
[Bootstrap] - User provisioning
[Delivery] - Token validation
[ArtifactWorker] - Job processing
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Smoke Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  smoke-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run migrations
        working-directory: apps/backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
        run: npx prisma migrate deploy

      - name: Run smoke tests
        working-directory: apps/backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          JWT_SECRET: test-secret
        run: npm run test:smoke
```

### Staging Deployment Check

Add smoke test after deployment:

```yaml
- name: Smoke test staging
  run: |
    cd apps/backend
    npx ts-node test/smoke/smoke-runner.ts ${{ vars.STAGING_API_URL }}
```

---

## Test Coverage Summary

The automated smoke test suite covers:

| Step | Flow | Endpoints |
|------|------|-----------|
| 1 | User Sign Up | `POST /auth/register` |
| 2 | Bootstrap | `GET /auth/me/bootstrap` |
| 3 | Create Project | `POST /projects/create` |
| 4 | Upload Media | `POST /media/confirm-upload` |
| 5 | Enable Delivery | `POST /projects/:id/delivery/enable` |
| 6 | Delivery Page | `GET /delivery/:token` |
| 7 | Download Artifact | `POST /delivery/:token/download-request`, `GET /delivery/:token/download-status/:id` |
| 8 | Comment & Approve | `POST /delivery/:token/comments`, `POST /delivery/:token/approve` |

---

## Version History

- **v1.0** - Initial smoke test suite for public MVP
