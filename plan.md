# YedaTechs Build - Project Plan

## Overview

This plan follows the incremental development approach for long-running agents as described in Anthropic's engineering guidance. Each session should:
1. Read this plan and the activity log
2. Run `init.sh` to verify the environment
3. Choose ONE feature to work on
4. Test thoroughly before marking complete
5. Commit changes and update activity.md

---

## Quick Start

```bash
# First session: Initialize project
./init.sh

# Every session: Check status
git log --oneline -10
cat activity.md
```

---

## Project Structure

```
vrem/
├── apps/
│   ├── frontend/                 # Next.js 16 application
│   │   ├── app/                  # App Router pages
│   │   │   ├── (protected)/      # Auth-required routes
│   │   │   │   ├── booking/      # Booking flow
│   │   │   │   ├── invoices/     # Invoice management
│   │   │   │   └── settings/     # User/org settings
│   │   │   └── onboarding/       # SSO onboarding flow
│   │   ├── components/           # React components
│   │   │   ├── ui/               # shadcn/ui design system (62 components)
│   │   │   └── features/         # Feature-specific components
│   │   ├── context/              # React context (auth, etc.)
│   │   ├── lib/                  # Utilities and API client
│   │   ├── hooks/                # Custom React hooks
│   │   ├── types/                # TypeScript types
│   │   └── public/               # Static assets
│   │
│   └── backend/                  # NestJS application
│       ├── src/
│       │   ├── auth/             # Authentication (Clerk + JWT)
│       │   ├── users/            # User management
│       │   ├── organizations/    # Multi-tenant organizations
│       │   ├── projects/         # Project/job management
│       │   ├── orders/           # Order processing
│       │   ├── invoices/         # Invoice management
│       │   ├── media/            # Media upload/delivery
│       │   ├── messages/         # Project messaging
│       │   ├── email/            # Email service (Resend)
│       │   ├── otp/              # OTP verification
│       │   ├── common/           # Shared utilities & filters
│       │   └── prisma/           # Database service
│       ├── prisma/
│       │   ├── schema.prisma     # Database schema
│       │   └── migrations/       # Database migrations
│       └── docs/                 # Backend documentation
│
├── docs/                         # Additional documentation
│   ├── nylas-setup.md            # Nylas calendar integration
│   └── stripe-testing.md         # Stripe testing guide
├── init.sh                       # Environment setup script
├── plan.md                       # This file
├── prd.md                        # Product requirements
├── activity.md                   # Session activity log
├── feature_list.json             # Feature tracking (DO NOT EDIT descriptions)
├── API-REFERENCE.md              # API endpoint documentation
└── DEPLOYMENT.md                 # Deployment guide
```

---

## Development Phases

### Phase 0: Project Setup
- Initialize monorepo structure
- Configure Next.js frontend
- Configure NestJS backend
- Set up Prisma with PostgreSQL
- Configure environment variables
- Set up development scripts

### Phase 1: Authentication & Users
- JWT authentication system
- User registration and login
- Role-based access control (RBAC)
- User profile management

### Phase 2: Core Dashboard UI
- Layout and navigation
- Role-specific dashboard views
- Responsive design foundation

### Phase 3: Project/Job Management
- Project CRUD operations
- Pipeline status management
- Assignment system

### Phase 4: Booking & Scheduling
- Booking form and flow
- Calendar integration (Nylas)
- Time slot selection

### Phase 5: Media Management
- File upload system (S3)
- Media gallery display
- Secure download links

### Phase 6: Messaging System
- Per-project chat threads
- Real-time updates
- Notifications

### Phase 7: Payment Integration
- Stripe checkout
- Payment status webhooks
- Invoice tracking

### Phase 8: Post-MVP Enhancements
- Invoicing system (CRUD, email sending, public payment links)
- SSO onboarding flow (account type + provider use case selection)
- Notification preferences (granular email controls)
- Account type switching (AGENT ↔ PROVIDER)
- Payment mode configuration (NO_PAYMENT, UPFRONT, INVOICE_AFTER_DELIVERY)
- Global exception filter & security headers
- Enhanced auth bootstrap & account deactivation

---

## Feature List

**IMPORTANT:** Do not remove or edit feature descriptions. Only update `passes` field after thorough testing.

See `feature_list.json` for the complete list with status tracking.

---

## Session Guidelines

### Starting a Session

1. **Orientation**
   ```bash
   pwd
   cat activity.md
   cat feature_list.json | head -100
   git log --oneline -10
   ```

2. **Verify Environment**
   ```bash
   ./init.sh
   ```

3. **Choose Next Feature**
   - Find first feature with `"passes": false`
   - Work on ONE feature at a time

### During Development

1. Write code incrementally
2. Test each change before moving on
3. Commit frequently with descriptive messages
4. If stuck, document the blocker in activity.md

### Ending a Session

1. **Verify Feature Works**
   - Run automated tests if available
   - Manual testing in browser
   - Test as the relevant user role

2. **Update Status**
   - Only mark `"passes": true` if fully working
   - Update activity.md with session summary

3. **Commit Progress**
   ```bash
   git add -A
   git commit -m "feat: [description of what was completed]"
   ```

4. **Document for Next Session**
   - Note any issues in activity.md
   - Identify next feature to work on

---

## Testing Requirements

Before marking any feature as passing:

### Frontend Features
- [ ] Component renders without errors
- [ ] Responsive on desktop and mobile
- [ ] Correct data displayed
- [ ] User interactions work
- [ ] Error states handled

### Backend Features
- [ ] API endpoint returns correct response
- [ ] Authentication/authorization enforced
- [ ] Database operations succeed
- [ ] Error handling works
- [ ] Input validation in place

### Full-Stack Features
- [ ] Frontend calls backend correctly
- [ ] Data flows end-to-end
- [ ] UI updates on state changes
- [ ] Works for all relevant user roles

---

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/vrem
CLERK_SECRET_KEY=sk_xxx
CLERK_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
NYLAS_CLIENT_ID=xxx
NYLAS_API_KEY=xxx
UPLOADCARE_PUBLIC_KEY=xxx
UPLOADCARE_SECRET_KEY=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=vrem-media
AWS_REGION=us-east-1
CRON_SECRET=xxx
```

---

## Commands Reference

### Development
```bash
# Frontend (from apps/frontend)
npm run dev          # Start dev server on :3000

# Backend (from apps/backend)
npm run start:dev    # Start dev server on :3001

# Database (from apps/backend)
npx prisma migrate dev    # Run migrations
npx prisma studio         # Open DB GUI
npx prisma generate       # Regenerate Prisma client
```

### Testing
```bash
# Frontend
npm run test
npm run test:e2e

# Backend
npm run test
npm run test:e2e
```

### Building
```bash
npm run build
npm run start
```

---

## Common Issues & Solutions

### Database Connection
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Reset database
npx prisma migrate reset
```

### Port Conflicts
```bash
# Find process on port
lsof -i :3000
kill -9 <PID>
```

### Prisma Issues
```bash
# Regenerate client
npx prisma generate

# Push schema without migration
npx prisma db push
```

---

## Architecture Notes

### Authentication Flow
1. User authenticates via Clerk (email/password, SSO, or OTP)
2. Clerk issues JWT token
3. Frontend includes Clerk JWT in Authorization header
4. Backend validates Clerk JWT and provisions/upserts user in Postgres
5. Bootstrap flow ensures personal org exists for new users
6. OrgContextGuard validates x-org-id header for org-scoped routes
7. RBAC policies enforce access based on org role

### Project Pipeline Flow
```
Agent creates booking
    ↓
Payment processed (Stripe)
    ↓
Project created (status: BOOKED)
    ↓
PM assigns Technician
    ↓
Technician starts shoot (status: SHOOTING)
    ↓
Technician completes (status: EDITING)
    ↓
Editor uploads media
    ↓
Editor delivers (status: DELIVERED)
    ↓
Agent downloads media
    ↓
Agent can rebook
```

### Data Access Patterns
- **Admin**: All data
- **PM**: All projects
- **Technician**: Only assigned projects
- **Editor**: Only assigned projects (in editing stage)
- **Agent**: Only own projects

---

## Next Steps

MVP (Phases 0-7) and post-MVP enhancements (Phase 8) are complete:
1. Commit all uncommitted work and verify database migrations
2. Deploy to staging environment
3. Internal dogfooding (use for VX operations)
4. Bug fixes and polish
5. Prepare for Private Alpha

---

*This plan is a living document. Update as needed but preserve the feature_list.json structure.*
