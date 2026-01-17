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
yedatechs/
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   │   ├── ui/        # Base UI components
│   │   │   ├── dashboard/ # Dashboard components
│   │   │   ├── booking/   # Booking flow components
│   │   │   └── projects/  # Project management components
│   │   ├── lib/           # Utilities and helpers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript types
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
│
├── backend/               # NestJS application
│   ├── src/
│   │   ├── modules/       # Feature modules
│   │   │   ├── auth/      # Authentication
│   │   │   ├── users/     # User management
│   │   │   ├── projects/  # Project/job management
│   │   │   ├── media/     # Media upload/delivery
│   │   │   ├── messages/  # Project messaging
│   │   │   └── payments/  # Stripe integration
│   │   ├── common/        # Shared utilities
│   │   └── prisma/        # Database schema
│   └── test/              # Tests
│
├── init.sh                # Environment setup script
├── plan.md               # This file
├── prd.md                # Product requirements
├── activity.md           # Session activity log
└── feature_list.json     # Feature tracking (DO NOT EDIT descriptions)
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
- Calendar integration (Cronofy)
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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/yedatechs
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=yedatechs-media
AWS_REGION=us-east-1
CRONOFY_CLIENT_ID=xxx
CRONOFY_CLIENT_SECRET=xxx
```

---

## Commands Reference

### Development
```bash
# Frontend (from /frontend)
npm run dev          # Start dev server on :3000

# Backend (from /backend)
npm run start:dev    # Start dev server on :3001

# Database
npx prisma migrate dev    # Run migrations
npx prisma studio         # Open DB GUI
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
1. User submits credentials
2. Backend validates and returns JWT
3. Frontend stores JWT in httpOnly cookie
4. Subsequent requests include JWT
5. Backend middleware validates JWT and extracts user role
6. RBAC policies enforce access based on role

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

## Next Steps After MVP

Once all Phase 0-7 features pass:
1. Deploy to staging environment
2. Internal dogfooding (use for VX operations)
3. Bug fixes and polish
4. Prepare for Phase 3 (Private Alpha)

---

*This plan is a living document. Update as needed but preserve the feature_list.json structure.*
