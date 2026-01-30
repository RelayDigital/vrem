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
- **Uploadcare** for file uploads
- **AWS S3** for file storage
- **AWS CloudFront** (CDN) for delivery

### Authentication & Authorization
- **Clerk** for authentication (JWT, SSO, OTP)
- **RBAC** (Role-Based Access Control) via org roles
- **Row-based multi-tenancy** via organization context

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
| Stripe manual billing | Integrated payment + invoicing | **Yes** |
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

Users have an **account type** (AGENT, PROVIDER, COMPANY) and an **organization role** that determines their permissions within each organization.

### Organization Roles (OrgRole)

### 1. Owner
- Full organization management, can delete org
- Manages users/roles and global settings
- Full access to all projects and data

### 2. Admin
- Can update settings and manage members
- Full access to all projects and data
- Cannot transfer ownership or delete org

### 3. Project Manager
- Oversees projects; assigns technicians and editors
- Sees pipeline of all jobs in all stages
- Handles exceptions (reschedules, cancellations)

### 4. Technician
- Field personnel conducting photo/video shoots
- Sees only assigned jobs in calendar
- Updates job status: Booked → Shooting → Editing
- Uploads raw files/notes and communicates via project chat

### 5. Editor
- Post-production staff
- Sees projects in Editing stage
- Uploads final media, marks job as Delivered

### 6. Agent (Customer)
- Books new shoots via provider organizations
- Views upcoming jobs and downloads delivered media
- Sees only their own projects and messages
- Can rebook after delivery
- Can be a customer of multiple provider organizations

---

## MVP Functional Modules

### 1. Booking & Scheduling Module

**Features:**
- Availability calendar (powered by Nylas)
- Property details form (address, service type, notes)
- Date/time slot selection with real-time availability
- Flexible payment modes: upfront (Stripe), invoice after delivery, or no payment
- Automatic calendar event creation on booking

**UI Flow:**
1. Agent clicks "Book New Shoot"
2. Fills property address and service details
3. Views available slots via Nylas calendar integration
4. Selects slot and proceeds (Stripe checkout if upfront payment, or direct order)
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
- Uploadcare + S3 storage backend
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

### 6. Invoicing Module

**Features:**
- Invoice CRUD with line items, tax calculation, and auto-totaling
- Status workflow: Draft → Sent → Paid/Void
- Auto-generate draft invoices when projects are delivered
- Email invoices with public payment link (via unique payment token)
- Invoice list with status filtering and summary statistics (outstanding balance, paid, overdue)

**UI Flow:**
1. Provider navigates to Invoices page
2. Creates invoice with customer, line items, tax rate, due date
3. Sends invoice (email with payment link)
4. Customer pays via public payment page
5. Invoice status updates to Paid

### 7. Role-Based Dashboards

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

### User
```
id, clerkUserId, email, name, password, avatarUrl, accountType (AGENT|PROVIDER|COMPANY),
onboardingCompletedAt, deactivatedAt, createdAt, updatedAt
```

### Organization
```
id, name, type (COMPANY|PERSONAL|TEAM), paymentMode (NO_PAYMENT|UPFRONT_PAYMENT|INVOICE_AFTER_DELIVERY),
legalName, logoUrl, phone, primaryEmail, websiteUrl, timezone,
addressLine1, city, region, postalCode, countryCode, lat, lng, createdAt
```

### OrganizationMember
```
id, userId (FK → User), orgId (FK → Organization), role (OWNER|ADMIN|TECHNICIAN|EDITOR|PROJECT_MANAGER|AGENT), createdAt
```

### OrganizationCustomer
```
id, orgId (FK → Organization), userId (FK → User), name, email, phone, notes, createdAt
```

### Project
```
id, orgId (FK → Organization), customerId (FK → OrganizationCustomer),
status (PENDING|BOOKED|SHOOTING|EDITING|DELIVERED|CANCELLED),
scheduledTime, addressLine1, city, region, postalCode, lat, lng,
technicianId, editorId, projectManagerId,
clientApprovalStatus, deliveryToken, paymentAmount, stripePaymentIntentId,
createdAt, updatedAt
```

### Invoice
```
id, invoiceNumber (auto-increment), orgId, customerId, projectId,
status (DRAFT|SENT|PAID|OVERDUE|CANCELLED|VOID),
items (JSON line items), subtotal, taxRate, taxAmount, total, currency,
dueDate, paidAt, sentAt, voidedAt, notes, paymentToken,
createdAt, updatedAt
```

### Message
```
id, projectId (FK → Project), userId (FK → User), content, channel (TEAM|CUSTOMER), timestamp
```

### Media
```
id, projectId (FK → Project), key, cdnUrl, externalUrl, filename, size, type (PHOTO|VIDEO|FLOORPLAN|DOCUMENT|VIRTUAL_TOUR), createdAt
```

### CalendarEvent
```
id, projectId (FK → Project), nylasEventId, nylasCalendarId, nylasGrantId, syncStatus, createdAt
```

### ServicePackage
```
id, orgId, name, description, price, currency, mediaTypes, turnaroundDays, photoCount, videoMinutes, features, isActive
```

### UserNotificationPreferences
```
id, userId, emailNewOrder, emailOrderConfirmed, emailProjectAssigned, emailStatusChange,
emailDeliveryReady, emailApprovalChange, emailNewMessage, emailInvoice, emailDigestFrequency
```

### Additional models: PendingOrder, PackageAddOn, Invitation, Notification, DownloadArtifact,
### UserCalendarIntegration, UserAvailability, ProviderUseCase, EmailOtp, TourProgress, TourStatus

---

## Third-Party Integrations

### Clerk (Authentication)
- User authentication (email/password, SSO, OTP)
- JWT token issuance and validation
- User profile and metadata sync

### Nylas (Calendar)
- Calendar syncing and availability checks
- Google Calendar and Microsoft Outlook integration
- Event creation and management via API

### Stripe (Payments)
- Checkout sessions for bookings (upfront payment mode)
- Webhook integration for payment status
- Customer and payment record sync

### Uploadcare (File Upload)
- Direct file uploads from browser
- File processing and transformation

### AWS S3 + CloudFront (Storage & CDN)
- File storage backend
- CDN delivery with signed URLs
- Download artifact generation (ZIP archives)

### Resend (Email)
- Transactional emails (invitations, invoices, notifications)
- Email template rendering

### Mapbox (Maps)
- Address geocoding and display
- Service area visualization

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
