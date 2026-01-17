# Product Requirements Document: Real Estate Media Production Platform

## Executive Summary

This document defines requirements for YedaTechs, a vertically-integrated Real-Estate Media SaaS platform that unifies booking, production management, media delivery, and team communication for real estate media companies.

**Core Value Proposition:** "The operating system for real estate media teams. Bookings → Dispatch → Production → Delivery → Payment. One system, zero chaos."

---

## Problem Statement

Real-estate media firms stitch together spreadsheets, email, and generic tools to manage shoots, edits, and delivery. This fragmentation:
- Wastes up to 10 hrs/week navigating disjointed tools
- Results in delays and errors that erode profit margins
- Creates inefficiency with no single source of truth

### Current Landscape
- **Aryeo**: Focuses on media delivery, not full project management
- **Generic PM tools** (Asana, Slack): Industry-agnostic, don't encode real-estate workflows
- Result: Agents and media teams juggle multiple apps with fractured processes

---

## Solution: Vertical Media OS

A purpose-built vertical SaaS platform that unifies the entire media workflow:
- Integrated scheduling and assignment
- In-app collaboration (chat and approvals)
- Turnkey media delivery (photos, 3D tours, etc.)
- Industry-specific data model (listing IDs, agent credits, shoot types)

---

## Tech Stack

### Frontend
- **Next.js** - Familiar to the team, flexible for quick iterations

### Backend
- **NestJS** - Handles scheduling, media uploads, payments, chat

### Database
- **PostgreSQL** with **Prisma ORM**
- **Redis** for caching

### Storage & Media Delivery
- **AWS S3** for file storage
- **AWS CloudFront** (CDN) for delivery

### Authentication & Authorization
- **JWT** or **OAuth** for authentication
- **RBAC** (Role-Based Access Control)
- **Row-based multi-tenancy**

### DevOps/Infrastructure
- **AWS** hosting
- **GitHub Actions** for CI/CD

---

## MVP Scope

The MVP replaces:
| Current Tool | Replacement | Required for MVP |
|-------------|-------------|------------------|
| Aryeo (Scheduling + Delivery) | Booking + Dispatch + Media Delivery | **Yes** |
| Asana (Task/Project Ops) | Shoot Pipeline / Job Status stages | **Yes** |
| Slack (Per-job communication) | In-app project messaging | **Yes** |
| Google Drive | S3-backed uploads + delivery UI | **Yes** |
| Stripe manual billing | Integrated payment + invoicing | **Eventually** |
| Social distribution tools | Post-launch feature | **No** |

### Core Pipeline Flow
```
Agent Books → Technician Shoots → Editor Delivers Media → Agent Rebooks
```

### Pipeline Stages
```
Booked → Shooting → Editing → Delivered
```

---

## User Roles & Permissions

### 1. Admin
- Manages users/roles and global settings
- Full access to all projects and data
- Can create/deactivate accounts and adjust system configurations

### 2. Project Manager (PM)
- Oversees projects; assigns technicians and editors
- Sees pipeline of all jobs in all stages
- Handles exceptions (reschedules, cancellations)

### 3. Technician
- Field personnel conducting photo/video shoots
- Sees only assigned jobs in calendar
- Updates job status: Booked → Shooting → Editing
- Uploads raw files/notes and communicates via project chat

### 4. Editor
- Post-production staff
- Sees projects in Editing stage
- Uploads final media, marks job as Delivered

### 5. Agent (Customer)
- Books new shoots
- Views upcoming jobs and downloads delivered media
- Sees only their own projects and messages
- Can rebook after delivery

---

## MVP Functional Modules

### 1. Booking & Scheduling Module

**Features:**
- Availability calendar (powered by Cronofy)
- Property details form (address, service type, notes)
- Date/time slot selection with real-time availability
- Stripe payment integration
- Automatic calendar event creation on booking

**UI Flow:**
1. Agent clicks "Book New Shoot"
2. Fills property address and service details
3. Views available slots via Cronofy calendar
4. Selects slot and proceeds to Stripe checkout
5. Receives confirmation; new job appears in dashboard

### 2. Job Assignment & Pipeline Management

**Features:**
- Pipeline view with stages: Booked → Shooting → Editing → Delivered
- Manual or automatic technician/editor assignment
- Real-time status updates and notifications
- Calendar blocking for assigned time slots

**PM Dashboard:**
- Kanban/list view grouped by status
- Project cards with ID, address, scheduled time, assigned personnel
- Click-to-assign dropdowns for technicians and editors

### 3. Project Stage Logic

| Stage | Description | Visible To |
|-------|-------------|------------|
| **Booked** | Paid and scheduled | Agent, PM |
| **Shooting** | Technician begins work | Agent, PM, Technician |
| **Editing** | Post-production in progress | Agent, PM, Editor |
| **Delivered** | Final media available | Agent, PM, All assigned |

### 4. Media Upload & Delivery

**Features:**
- Drag-and-drop upload interface for editors
- Supabase/S3 storage backend
- Secure pre-signed URLs for downloads
- Thumbnail previews in agent dashboard
- Support for multiple file types (photos, video, zip)

**UI Flow:**
1. Editor sees projects in Editing Queue
2. Opens project, drags/drops final media
3. Clicks "Mark Delivered"
4. Agent receives notification
5. Agent views thumbnails and downloads

### 5. Per-Project Messaging

**Features:**
- Dedicated chat thread per project
- Messages stored chronologically
- Mentions and markdown support
- File attachments (optional extension)
- In-app and email notifications

### 6. Role-Based Dashboards

**Admin Dashboard:**
- System metrics (total projects, active users)
- User management panels
- Quick list of unresolved projects

**PM Dashboard:**
- Pipeline view (4 columns)
- Calendar/agenda view for conflicts
- Create Project button

**Technician Dashboard:**
- Assigned Shoots list (sorted by date)
- "Start Shoot" and "Complete Shoot" buttons
- Calendar integration

**Editor Dashboard:**
- Projects to Edit list
- Upload interface per project
- History of delivered assets

**Agent Dashboard:**
- Upcoming Shoots list
- Delivered Media section with downloads
- "Book New Shoot" button
- Past invoice list

---

## Data Model (Core Tables)

### users
```
id: UUID (PK)
name: string
email: string
role: enum ('admin', 'pm', 'technician', 'editor', 'agent')
```

### projects
```
id: UUID (PK)
agent_id: UUID (FK → users)
address: string
scheduled_time: timestamp
status: enum ('booked', 'shooting', 'editing', 'delivered')
technician_id: UUID (FK → users)
editor_id: UUID (FK → users)
created_at: timestamp
updated_at: timestamp
```

### messages
```
id: UUID (PK)
project_id: UUID (FK → projects)
sender_id: UUID (FK → users)
content: text
timestamp: timestamp
```

### media_items
```
id: UUID (PK)
project_id: UUID (FK → projects)
file_url: text
file_type: enum ('image', 'video')
created_at: timestamp
```

### payments
```
id: UUID (PK)
project_id: UUID (FK → projects)
stripe_payment_id: string
amount: decimal
currency: string
status: string
created_at: timestamp
```

### calendar_events
```
id: UUID (PK)
project_id: UUID (FK → projects)
cronofy_event_id: string
calendar_id: string
created_at: timestamp
```

---

## Third-Party Integrations (MVP)

### Cronofy (Scheduling)
- Calendar syncing and availability checks
- Slot Picker UI component for booking page
- Real-time scheduling engine

### Stripe (Payments)
- Checkout sessions for bookings
- Webhook integration for payment status
- Customer and payment record sync

### AWS S3 / Supabase Storage
- File uploads and serving
- CDN delivery
- Secure pre-signed URLs

---

## Post-MVP Features (Future Roadmap)

### 1. Interactive Map Dashboard
- Listing & shoot heatmaps
- Coverage and territory views
- Project playback/timeline
- Interactive pins & routes
- Predictive planning

### 2. Real-Time Agent Collaboration
- Live shoot tracking (GPS-based)
- In-app media proofing with annotations
- Live-shoot mode (remote coaching)
- Instant push notifications

### 3. Social Media Distribution Engine
- Multi-platform posting (Instagram, TikTok, Facebook, YouTube)
- Smart content generation (captions, hashtags)
- Content scheduling & queue
- Post-performance analytics

### 4. Public Property Sites & Portfolios
- Property microsites with galleries
- Lead capture forms
- Agent portfolio pages
- SEO optimization
- White-label branding

### 5. Workflow Automation Builder
- Drag-and-drop rule builder
- Pre-built SOP templates
- SLA timers and escalation
- Conditional logic (AND/OR)

### 6. Unified Analytics Layer
- Custom dashboards per role
- Agent LTV & rebooking forecasts
- Spatial analytics
- Export & BI integration
- Predictive insights

### 7. Marketplace (Agent-Photographer Matching)
- Job posting and discovery
- Bid/accept workflow
- Ratings & quality control
- Dynamic pricing & payments
- Freelancer onboarding

---

## Security & Compliance

### MVP Security
- JWT-based authentication with role-based access (RBAC)
- Row-Level Security (RLS) for data isolation
- HTTPS/TLS encryption in transit
- Signed URLs for media access

### Post-MVP Security
- Single Sign-On (SAML/OAuth with Okta, Azure AD)
- 2FA enforcement
- Data encryption at rest
- SOC 2 Type II compliance
- GDPR compliance
- Custom access controls (ABAC)
- Regular penetration testing
- Automated backups with tested recovery

---

## Success Criteria

**Key Principle:** If we can run our own business on it, the product is saleable.

### MVP Success Metrics
- Core pipeline runs reliably (Booked → Shooting → Editing → Delivered)
- No parallel project management tools required
- All communication stays within platform
- File storage and retrieval is smooth and stable

### Target KPIs (Post-Launch)
- Time-to-first-cash (MRR ramp)
- Month-over-month GMV growth
- Reduction in average turnaround time
- Customer retention rates
- Net Revenue Retention > 110%

---

## Design Principles

1. **One-click philosophy** - Minimize clicks for common actions
2. **Minimal aesthetic** - Clean, task-focused interfaces
3. **Mobile-responsive** - Optimized for desktop, functional on mobile
4. **Role-based views** - Each user sees only what's relevant
5. **Real-time updates** - Live status changes and notifications

---

*Last Updated: January 2026*
