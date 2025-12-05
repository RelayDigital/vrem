# VREM - Real-Estate Media OS

VREM is a vertically-integrated Real-Estate Media Operating System that unifies scheduling, production workflow, media delivery, collaboration, and analytics for agents, technicians, editors, and project managers. It replaces fragmented tools (e.g. Aryeo, Asana, Slack) with one unified platform.

## 🎯 Overview

VREM is a comprehensive, cloud-native platform that manages the complete lifecycle of real estate media production:

- **Agents** create shoot orders with real-time calendar slot selection and payment capture
- **Project Managers** assign technicians/editors and progress jobs through pipeline stages
- **Technicians/Technicians** capture media and upload raw assets during shoots
- **Editors** process and deliver final media to clients
- **Clients** review, approve, and download media through delivery pages

The platform orchestrates the entire workflow from **Booked → Shooting → Editing → Delivered**, with real-time collaboration, media management, and intelligent technician matching at every stage.

## 🏗️ Architecture

VREM is built as a cloud-native, microservices architecture with a monorepo structure:

```
vrem/
├── apps/
│   ├── frontend/          # Next.js 16 frontend application
│   │   └── vrem-app/      # Main frontend app
│   └── backend/           # NestJS backend API (microservices-ready)
├── docker-compose.yml     # Docker services (PostgreSQL, Redis)
└── README.md             # This file
```

### System Architecture

The platform consists of:

- **Frontend**: Next.js application with server-side rendering and static optimization
- **Backend API**: NestJS RESTful API with WebSocket support for real-time features
- **Database**: PostgreSQL with Prisma ORM for type-safe database access
- **Cache**: Redis for sessions, pub/sub, and frequently accessed data
- **Storage**: AWS S3 for media files with CloudFront CDN for delivery
- **External Integrations**: 
  - Stripe for payments
  - Cronofy for calendar sync
  - Mapbox for maps and geocoding
  - Future: Social API connections (Instagram, Facebook, TikTok, MLS feeds)

### Deployment Architecture

- **Global**: Route 53 DNS, CloudFront CDN
- **Regional**: Load balancers, API services, databases, caches (multi-AZ)
- **Auto-scaling**: Stateless services scale horizontally
- **Multi-region**: Active-active deployment with data replication

## ✨ Key Features

### Scheduling & Booking
- **Advanced Calendar Integration**: Real-time calendar slot selection via Cronofy or similar services
- **Payment Capture**: Stripe Checkout integration for seamless payment processing
- **Smart Booking Flow**: Multi-step wizard for creating shoot orders (address, date, package, client)
- **AI Technician Matching**: Automatic ranking based on availability, proximity, reliability, skills, and preferred vendor relationships
- **Real-time Address Search**: Mapbox integration for address autocomplete and geocoding
- **Calendar Sync**: Automatic updates to both agency and technician calendars upon confirmation

### Pipeline-Driven Workflow
- **Stage Management**: Progress jobs through stages (Booked → Shooting → Editing → Delivered)
- **Task Assignment**: PMs assign technicians/editors to specific jobs and tasks
- **Status Transitions**: Automated notifications and workflow rules triggered by status changes
- **Kanban Board**: Visual job management with drag-and-drop functionality across pipeline stages
- **Task Tracking**: Detailed task management with notes, deadlines, and dependencies

### Media Upload & Delivery
- **S3/CloudFront Integration**: Scalable media storage with CDN-backed delivery
- **High-Resolution Uploads**: Support for large photo and video files (tens of MB each)
- **Client Delivery Pages**: Generate preview pages with "download all" functionality
- **Media Proofing**: Clients can approve or request revisions via in-app review tools
- **Media Organization**: Store references, metadata, and generate optimized versions

### Communication & Collaboration
- **Threaded Job Chat**: Every job has a dedicated chat with mentions and real-time updates
- **Live Shoot Tracking**: Real-time GPS/status updates ("On Site", "Uploading", etc.)
- **Image Annotation**: Agents and PMs can annotate images during review
- **Video Streaming**: Optional live video streaming during shoots
- **Instant Notifications**: Email/SMS/in-app notifications keep all stakeholders synced

### Multi-Tenant Enterprise Support
- **Role-Based Access Control (RBAC)**: Admin, Project Manager, Editor/Technician, Agent, Technician roles
- **Row-Based Multi-Tenancy**: Secure data isolation at the database level
- **Enterprise SSO**: SAML/OIDC support for brokerages (planned)
- **Custom Branding**: Per-tenant configuration and branding
- **Audit Logging**: Complete activity tracking for compliance and transparency
- **Custom Configuration**: Per-tenant pricing, services, and policies

### Analytics & Insights
- **Metrics Dashboard**: Track key performance indicators and analytics
- **Team Performance**: Monitor technician reliability, on-time rates, and ratings
- **Workflow Analytics**: Track pipeline efficiency and bottleneck identification
- **Business Intelligence**: Export data for external BI tools and reporting

### Future: Marketplace Expansion
- **Automated Matching**: Agents request shoots and are automatically paired with highest-ranked available technicians
- **Location-Based Routing**: Intelligent assignment based on location, schedule, and reliability
- **Stripe Connect Integration**: Standardized payments and payouts for marketplace transactions
- **Reassignment Logic**: Automatic re-routing if technician declines or times out

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router) with React 19
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS v4
- **Maps**: Mapbox GL JS (migrated from Google Maps)
- **Rich Text Editor**: Tiptap
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Notifications**: Sonner
- **TypeScript**: Full type safety

### Backend
- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: OAuth2.0/JWT with role-based access control (RBAC)
- **API**: RESTful API architecture
- **Real-time**: WebSocket/Pub-Sub for live collaboration (Redis Streams or AWS AppSync)

### Infrastructure
- **Database**: PostgreSQL 16 (Aurora-compatible for production)
- **Cache**: Redis 7 (for sessions, pub/sub, and caching)
- **Storage**: AWS S3 with CloudFront CDN for media delivery
- **Containerization**: Docker Compose (development)
- **Cloud Deployment**: AWS (EC2, ECS, EKS) with multi-region support
- **Load Balancing**: Route 53 DNS with latency-based routing
- **Background Jobs**: Message queue system (SQS + workers) for async processing

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vrem
```

### 2. Start Infrastructure Services
```bash
docker-compose up -d
```

This starts PostgreSQL and Redis services.

### 3. Set Up Backend

```bash
cd apps/backend

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
# DATABASE_URL="postgresql://vrem_user:vrem_pass@localhost:5432/vrem"

# Run Prisma migrations
npx prisma migrate dev

# Start the backend server
npm run start:dev
```

The backend will run on `http://localhost:3001` (or the port configured in your environment).

### 4. Set Up Frontend

```bash
cd apps/frontend/vrem-app

# Install dependencies
npm install

# Set up environment variables
# Create a .env.local file with:
# NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`.

### 5. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧠 AI Ranking Algorithm

Technicians are automatically ranked and matched to jobs using a weighted algorithm that considers:

- **Availability** (30%): Must be available on the requested date (calendar sync)
- **Preferred Relationships** (25%): Preferred vendors get priority in assignments
- **Reliability** (20%): Based on on-time rate, no-show history, and past performance
- **Distance** (15%): Proximity to job location using Haversine formula
- **Skill Match** (10%): Expertise in required media types (photography, video, aerial, twilight)

The system automatically assigns the highest-ranked available technician, with fallback logic for declines or timeouts. Agents can review assigned technicians and request reassignment if needed.

See `apps/frontend/vrem-app/lib/ranking.ts` for implementation details.

## 📊 Workflow Pipeline

VREM manages the complete media production lifecycle through a pipeline-driven workflow:

1. **Booked**: Agent creates shoot order with payment capture and calendar confirmation
2. **Shooting**: Technician assigned, captures media, uploads raw assets to S3
3. **Editing**: Editor processes media, uploads final deliverables
4. **Delivered**: Client receives delivery page with preview and download options

Each stage transition triggers:
- Automated notifications to relevant stakeholders
- Status updates across the platform
- Workflow rules and automation
- Real-time chat updates
- Audit log entries

Status changes are tracked in real-time, visible in dashboards, kanban boards, and map views.

## 📁 Project Structure

### Root Structure
```
vrem/
├── apps/
│   ├── frontend/         # Next.js frontend application
│   │   └── vrem-app/     # Main frontend app
│   └── backend/          # NestJS backend API
├── docker-compose.yml    # Docker services (PostgreSQL, Redis)
└── README.md            # This file
```

### Frontend (`apps/frontend/vrem-app/`)
```
vrem-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Landing/home page
│   ├── globals.css              # Global styles & theme variables
│   ├── login/                   # Login page
│   ├── signup/                  # Signup page
│   └── (protected)/             # Protected routes (require auth)
│       ├── agent/               # Agent role pages
│       │   ├── booking/         # Booking flow
│       │   ├── jobs/            # Job management
│       │   ├── layout.tsx       # Agent layout
│       │   └── settings/        # Agent settings
│       ├── dispatcher/          # Dispatcher/PM role pages
│       │   ├── audit/           # Audit log view
│       │   ├── calendar/        # Calendar view
│       │   ├── jobs/            # Job management
│       │   │   ├── [jobId]/    # Individual job detail
│       │   ├── map/             # Live map view
│       │   ├── settings/        # Settings (account, personal, product)
│       │   ├── team/            # Team management
│       │   └── layout.tsx       # Dispatcher layout
│       ├── technician/        # Technician role pages
│       │   ├── companies/       # Company applications
│       │   ├── jobs/            # Job dashboard
│       │   ├── profile/         # Profile management
│       │   ├── settings/        # Technician settings
│       │   └── layout.tsx       # Technician layout
│       ├── booking/             # Shared booking page
│       ├── calendar/            # Shared calendar page
│       ├── dashboard/           # Shared dashboard
│       ├── jobs/                # Shared jobs page
│       ├── map/                 # Shared map page
│       └── settings/            # Shared settings page
│
├── components/
│   ├── VremApp.tsx              # Main application orchestrator
│   ├── login-form.tsx           # Login form component
│   ├── signup-form.tsx          # Signup form component
│   ├── theme-provider.tsx       # Theme context provider
│   │
│   ├── features/                # Feature-specific components
│   │   ├── agent/               # Agent features
│   │   │   ├── AgentBookingFlow.tsx
│   │   │   ├── AgentJobsView.tsx
│   │   │   ├── steps/           # Booking wizard steps
│   │   │   └── views/           # Agent views
│   │   ├── dispatcher/          # Dispatcher/PM features
│   │   │   ├── CompanyDashboard.tsx
│   │   │   ├── CompanySidebar.tsx
│   │   │   ├── AuditLog.tsx
│   │   │   ├── JobAssignment.tsx
│   │   │   ├── dialogs/         # Ranking dialogs
│   │   │   └── views/           # Dashboard, Jobs, Audit, Team, Map views
│   │   ├── technician/        # Technician features
│   │   │   ├── ProviderDashboard.tsx
│   │   │   ├── ProviderCard.tsx
│   │   │   ├── ProviderManagement.tsx
│   │   │   ├── ProviderSearch.tsx
│   │   │   └── views/           # Companies, Jobs, Profile views
│   │   ├── calendar/            # Calendar components
│   │   │   ├── CalendarView.tsx
│   │   │   ├── DayView.tsx, WeekView.tsx, MonthView.tsx, ListView.tsx
│   │   │   └── CalendarEventCard.tsx, CalendarEventPill.tsx
│   │   ├── dashboard/           # Dashboard components
│   │   └── landing/              # Landing page sections
│   │       └── sections/        # Hero, Features, CTA, etc.
│   │
│   ├── shared/                  # Reusable shared components
│   │   ├── jobs/                # Job-related components
│   │   │   ├── JobCard.tsx, JobCardKanban.tsx
│   │   │   ├── JobRequestForm.tsx
│   │   │   ├── JobListSection.tsx
│   │   │   └── PaginatedJobGrid.tsx
│   │   ├── tasks/               # Task management
│   │   │   └── JobTaskView.tsx
│   │   ├── kanban/              # Kanban board
│   │   │   └── JobKanbanBoard.tsx
│   │   ├── chat/                # Chat functionality
│   │   │   └── JobChat.tsx
│   │   ├── map/                 # Map visualization
│   │   │   └── MapView.tsx
│   │   ├── search/              # Address search & filters
│   │   │   ├── AddressSearch.tsx
│   │   │   └── OrganizationSwitcher.tsx
│   │   ├── dashboard/           # Dashboard components
│   │   │   ├── StatsCard.tsx, StatsGrid.tsx
│   │   │   ├── JobListCard.tsx
│   │   │   ├── MapWithSidebar.tsx
│   │   │   └── MiniCalendarView.tsx
│   │   ├── metrics/             # Analytics components
│   │   │   └── MetricsDashboard.tsx
│   │   ├── ranking/             # Ranking components
│   │   │   └── RankingFactors.tsx
│   │   ├── technician/        # Technician components
│   │   │   ├── FindTechnicianView.tsx
│   │   │   └── TechnicianRankingsView.tsx
│   │   ├── tables/              # Data tables
│   │   │   └── TeamTable.tsx
│   │   ├── settings/            # Settings components
│   │   │   └── SettingsView.tsx
│   │   ├── layout/               # Layout components
│   │   │   ├── AppHeader.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── loading/             # Loading skeletons
│   │   ├── modals/              # Modal components
│   │   └── ContextSwitcher.tsx  # Organization/context switcher
│   │
│   ├── ui/                      # shadcn/ui design system components
│   │   ├── button.tsx, input.tsx, card.tsx, etc.
│   │   ├── shadcn-io/           # Third-party UI components
│   │   │   ├── kanban/          # Kanban board component
│   │   │   └── navbar-11/       # Navbar component
│   │   └── ...                  # 50+ UI components
│   │
│   └── common/                  # Common utilities and cards
│       ├── cards/               # Card components
│       │   ├── JobDetailCard.tsx
│       │   ├── ApplicationCard.tsx
│       │   ├── CompanyCard.tsx
│       │   └── EmptyState.tsx
│       ├── forms/                # Form components
│       │   └── ProfileEditor.tsx
│       └── figma/                # Figma-derived components
│           └── ImageWithFallback.tsx
│
├── context/                     # React context providers
│   ├── DispatcherNavigationContext.tsx
│   ├── JobCreationContext.tsx
│   ├── JobManagementContext.tsx
│   ├── MessagingContext.tsx
│   └── map-context.tsx
│
├── hooks/                       # Custom React hooks
│   └── useRequireRole.ts        # Role-based access control hook
│
├── lib/                         # Utilities & helpers
│   ├── ranking.ts               # AI ranking algorithm
│   ├── calendar-utils.ts        # Calendar utility functions
│   ├── mock-data.ts             # Sample data for development
│   ├── utils.ts                 # General utility functions
│   └── mapbox/                  # Mapbox integration
│       └── provider.tsx
│
├── types/                       # TypeScript type definitions
│   ├── index.ts                 # Main type definitions
│   ├── chat.ts                  # Chat-related types
│   └── calendar.ts              # Calendar-related types
│
├── public/                      # Static assets
│   └── *.svg                    # SVG icons
│
├── components.json              # shadcn/ui configuration
├── next.config.ts              # Next.js configuration
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

### Backend (`apps/backend/`)
```
backend/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root NestJS module
│   ├── app.controller.ts       # Root controller
│   ├── app.service.ts          # Root service
│   │
│   ├── auth/                   # Authentication module
│   │   ├── auth.controller.ts  # Auth endpoints (login, signup)
│   │   ├── auth.service.ts     # Auth business logic
│   │   ├── auth.module.ts      # Auth module
│   │   ├── jwt.strategy.ts     # JWT authentication strategy
│   │   ├── jwt-auth.guard.ts   # JWT guard
│   │   ├── roles.decorator.ts  # Role decorator
│   │   ├── roles.guard.ts      # Role-based authorization guard
│   │   ├── current-user.decorator.ts  # Current user decorator
│   │   └── public.decorator.ts # Public route decorator
│   │
│   ├── users/                  # User management module
│   │   ├── users.controller.ts # User CRUD endpoints
│   │   ├── users.service.ts    # User business logic
│   │   ├── users.module.ts     # User module
│   │   └── dto/                # Data Transfer Objects
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── projects/               # Project/Job management module
│   │   ├── projects.controller.ts  # Project endpoints
│   │   ├── projects.service.ts     # Project business logic
│   │   ├── projects.module.ts      # Project module
│   │   ├── projects.controller.spec.ts  # Controller tests
│   │   ├── projects.service.spec.ts     # Service tests
│   │   └── dto/                     # Project DTOs
│   │       ├── create-project.dto.ts
│   │       ├── update-project.dto.ts
│   │       ├── update-project-status.dto.ts
│   │       ├── assign-project.dto.ts
│   │       └── create-message.dto.ts
│   │
│   ├── organizations/         # Multi-tenant organization module
│   │   ├── organizations.controller.ts
│   │   ├── organizations.service.ts
│   │   ├── organizations.module.ts
│   │   ├── org-member.guard.ts  # Organization member guard
│   │   └── dto/
│   │       ├── create-organization.dto.ts
│   │       ├── create-invite.dto.ts
│   │       └── accept-invite.dto.ts
│   │
│   ├── messages/              # Real-time messaging module
│   │   ├── messages.controller.ts
│   │   ├── messages.service.ts
│   │   ├── messages.gateway.ts  # WebSocket gateway
│   │   ├── messages.module.ts
│   │   └── dto/
│   │       └── send-message.dto.ts
│   │
│   ├── media/                 # Media upload & delivery module
│   │   ├── media.controller.ts
│   │   ├── media.service.ts
│   │   ├── media.module.ts
│   │   ├── utils/
│   │   │   └── cdn.util.ts    # CDN utility functions
│   │   └── dto/
│   │       └── confirm-upload.dto.ts
│   │
│   ├── cronofy/               # Calendar integration module
│   │   ├── cronofy.controller.ts
│   │   ├── cronofy.service.ts
│   │   └── cronofy.module.ts
│   │
│   ├── dashboard/             # Dashboard analytics module
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   └── dashboard.module.ts
│   │
│   ├── inquiries/             # Inquiry/lead management module
│   │   ├── inquires.controller.ts
│   │   ├── inquires.service.ts
│   │   ├── inquires.module.ts
│   │   └── dto/
│   │       ├── create-inquiry.dto.ts
│   │       └── update-inquiry.dto.ts
│   │
│   ├── onboarding/            # User onboarding module
│   │   ├── onboarding.controller.ts
│   │   └── onboarding.service.ts
│   │
│   └── prisma/                # Prisma ORM service
│       └── prisma.service.ts  # Database service
│
├── prisma/
│   ├── schema.prisma          # Prisma database schema
│   └── migrations/            # Database migrations
│
├── test/                      # End-to-end tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── prisma.config.ts           # Prisma configuration
├── nest-cli.json              # NestJS CLI configuration
├── tsconfig.json              # TypeScript configuration
├── tsconfig.build.json        # Build TypeScript configuration
├── eslint.config.mjs          # ESLint configuration
└── package.json               # Dependencies
```

## 🎨 Design System

The application uses an **Uber-inspired color scheme**:
- Clean black and white aesthetic
- High contrast for readability
- Minimal color distractions
- Professional, premium feel

Customize the theme by editing `apps/frontend/vrem-app/app/globals.css` (see CSS variables in `:root` and `.dark` sections).

## 📱 Responsive Design

The app is fully responsive with breakpoints at:
- Mobile: 320px+
- Tablet: 600px+
- Desktop: 1136px+ (max-width: 1280px)

## 🔐 Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (`.env`)
```env
# Database
DATABASE_URL="postgresql://vrem_user:vrem_pass@localhost:5432/vrem"

# Server
PORT=3001
NODE_ENV=development

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# AWS S3 (for media storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=vrem-media

# CloudFront (for CDN)
CLOUDFRONT_DOMAIN=your_cloudfront_domain

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Cronofy (for calendar sync)
CRONOFY_CLIENT_ID=your_cronofy_client_id
CRONOFY_CLIENT_SECRET=your_cronofy_client_secret
```

## 🧪 Development

### Running Tests

**Backend:**
```bash
cd apps/backend
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
```

**Frontend:**
```bash
cd apps/frontend/vrem-app
npm run lint          # ESLint
```

## 📈 Scalability & Capacity Planning

VREM is designed to scale horizontally to support enterprise-level operations:

### Expected Load (Mature SaaS Scenario)
- **Users**: 10,000+ daily active users (agents, PMs, technicians, editors)
- **Concurrent Sessions**: 1,000+ concurrent web sessions or WebSocket connections
- **API Throughput**: Thousands of requests per second at peak
- **Jobs**: 5,000+ shoots per day across all customers

### Media Storage
- **Per Job**: 10-50 high-res photos (5-20MB each) + occasional 4K video (100+MB)
- **Daily Volume**: ~250 GB/day, 7.5 TB/month of raw media
- **Annual Scale**: Petabyte-scale with multiple copies (original, optimized, CDN replication)
- **Storage Solution**: S3 with auto-scaling and cross-region replication

### Database
- **Scale**: <100M rows after years of use
- **Throughput**: >1,000 writes/sec at peak
- **Solution**: Aurora PostgreSQL with global replicas and sharding support

### Real-time Collaboration
- **Live Sessions**: Dozens of concurrent live shoot sessions
- **WebSocket/Pub-Sub**: Hundreds of real-time streams
- **Solution**: Redis Streams or AWS AppSync PubSub for low-latency updates

### Bandwidth
- **Media Delivery**: 5-10 TB/day egress from S3/CDN
- **Optimization**: CloudFront CDN with 95%+ hit ratio reduces origin traffic
- **API Traffic**: Minimal (few MB/day of JSON)

### Scaling Strategy
- **Horizontal Scaling**: Stateless services scale independently
- **Auto-scaling**: CPU/memory and request-based policies
- **Multi-region**: Active-active deployment across regions
- **Database Replication**: Read replicas for query scaling
- **CDN Caching**: Edge caching for media and static assets

## 🚢 Deployment

VREM is designed for cloud-native, multi-region deployment with high availability (99.9%+ uptime).

### Architecture Overview

The platform uses a microservices architecture deployed across multiple AWS regions:

- **Global Components**: Route 53 DNS, CloudFront CDN
- **Regional Components**: Load balancers, API services, databases, caches
- **Auto-scaling**: Stateless services scale horizontally based on demand
- **Multi-region Replication**: Databases and storage replicated across regions for failover

### Frontend Deployment
- **Recommended**: Vercel or AWS Amplify (Next.js optimized)
- **Alternative**: Self-hosted on EC2/ECS with CloudFront CDN
- **Static Assets**: Served via CloudFront for global edge caching

### Backend Deployment
- **Primary**: AWS ECS/EKS with auto-scaling groups
- **Load Balancing**: Application Load Balancer (ALB) with health checks
- **Container Orchestration**: Kubernetes or ECS for rolling updates and blue/green deployments
- **Multi-AZ**: Deploy across multiple availability zones for redundancy

### Database & Storage
- **Database**: Amazon Aurora PostgreSQL (Global Database for multi-region)
  - Master in primary region, read replicas in secondary regions
  - Automated backups with cross-region replication
- **Cache**: ElastiCache Redis (clustered mode with replicas)
- **Media Storage**: S3 with Cross-Region Replication
  - CloudFront CDN for low-latency global delivery
  - Multi-Region Access Points for data locality

### Infrastructure as Code
- **Terraform/CloudFormation**: All infrastructure defined as code
- **CI/CD**: GitHub Actions or AWS CodePipeline
- **Environments**: Staging, QA, and production with identical configurations

### Monitoring & Operations
- **Metrics**: CloudWatch/Datadog for application and infrastructure metrics
- **Logging**: CloudWatch Logs or ELK stack for centralized logging
- **Error Tracking**: Sentry for real-time error monitoring
- **Alerting**: Slack/PagerDuty integration for critical incidents

## 🔒 Security & Compliance

VREM implements enterprise-grade security practices:

- **Authentication**: OAuth2.0/JWT with secure token management
- **Authorization**: RBAC and ABAC (Attribute-Based Access Control) for least privilege
- **Data Isolation**: Row-based multi-tenancy at the database level
- **Encryption**: HTTPS/TLS everywhere, signed S3 URLs for media access
- **Audit Logging**: Complete activity tracking for compliance
- **PCI Compliance**: Stripe handles payment card data (we never store full card numbers)
- **GDPR/CCPA**: Data export and deletion tools for "right to be forgotten"
- **Compliance**: SOC2 and ISO compliance planned for enterprise tiers
- **Security Testing**: Regular penetration tests and static analysis (Snyk)

## 🛡️ Reliability & Operations

### High Availability
- **Uptime Target**: 99.9%+ availability SLA
- **Multi-Region**: Active-active deployment with automatic failover
- **Health Checks**: Automated health monitoring and alerting
- **Self-Healing**: Kubernetes/ECS automatically replaces unhealthy instances

### Backup & Recovery
- **Database Backups**: Continuous automated snapshots with cross-region copy
- **Storage Backups**: S3 versioning and cross-region replication
- **RPO/RTO**: Recovery Point Objective (15min), Recovery Time Objective (1hr)
- **Disaster Recovery**: Tested failover procedures via Route 53 health checks

### Monitoring & Alerting
- **Metrics**: CloudWatch/Datadog for application and infrastructure metrics
- **Logging**: Centralized JSON logs (ELK/CloudWatch Logs)
- **Error Tracking**: Sentry for real-time error monitoring
- **Alerting**: Slack/PagerDuty integration with on-call rotation
- **Dashboards**: SLI tracking (uptime, latency, error rates)

### CI/CD & Testing
- **Environments**: Staging, QA, and production with identical configurations
- **Automated Testing**: Unit, integration, and E2E tests before deployment
- **Feature Flags**: Gradual rollout capabilities
- **Infrastructure as Code**: Terraform for reproducible environments
- **Rollback**: Quick rollback capability (minutes)

## 📚 Documentation

- [Frontend README](./apps/frontend/vrem-app/README.md) - Detailed frontend documentation
- [Backend README](./apps/backend/README.md) - Backend setup and API documentation
- [Component Structure](./apps/frontend/vrem-app/components/README.md) - Component architecture

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

Copyright © 2025 VREM Operations

## 🎯 Vision

VREM replaces fragmented tools (Aryeo, Asana, Slack) with one unified platform, providing:

- **Single Source of Truth**: All job data, media, and communication in one place
- **Streamlined Workflow**: End-to-end pipeline from booking to delivery
- **Real-time Collaboration**: Live updates, chat, and media proofing
- **Enterprise Scale**: Multi-tenant architecture with SSO and custom branding
- **Future Marketplace**: Automated technician matching and assignment

The platform is engineered for enterprise scale and reliability, supporting high-availability needs with multi-region deployment and comprehensive monitoring.

## 🔗 Related Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Cronofy API Documentation](https://docs.cronofy.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

