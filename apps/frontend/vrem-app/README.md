# VREM Frontend Application

The frontend application for VREM (Real-Estate Media OS) - a vertically-integrated platform that unifies scheduling, production workflow, media delivery, collaboration, and analytics. Built with Next.js 16, React 19, and shadcn/ui.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

The application requires several environment variables for full functionality.

1. Create a `.env.local` file in the root:
   ```env
   # Mapbox (Required for Maps)
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
   
   # API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

2. Get a Mapbox access token from [Mapbox Account](https://account.mapbox.com/)

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 4. Build for Production
```bash
npm run build
npm start
```

## 📁 Project Structure

```
vrem-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Landing/home page
│   ├── globals.css              # Global styles & theme variables
│   ├── login/                   # Login page
│   ├── signup/                  # Signup page
│   └── (protected)/             # Protected routes (require authentication)
│       ├── agent/               # Agent role pages
│       │   ├── booking/         # Booking flow
│       │   ├── jobs/            # Job management
│       │   ├── settings/        # Agent settings
│       │   └── layout.tsx       # Agent layout
│       ├── dispatcher/          # Dispatcher/PM role pages
│       │   ├── audit/           # Audit log view
│       │   ├── calendar/        # Calendar view
│       │   ├── jobs/            # Job management
│       │   │   ├── [jobId]/    # Individual job detail
│       │   │   ├── all/         # All jobs view
│       │   │   └── project-management/  # Job management view
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
│   │   │   ├── steps/           # Booking wizard steps (Address, Details, Technician Selection)
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
│   │       └── sections/        # Hero, Features, CTA, Footer, etc.
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
│       ├── forms/               # Form components
│       │   └── ProfileEditor.tsx
│       └── figma/               # Figma-derived components
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

## ✨ Features

### Scheduling & Booking
- **Advanced Booking Flow**: Multi-step wizard for creating shoot orders (address, date, package, client)
- **Real-time Calendar Integration**: Calendar slot selection with automatic sync
- **Payment Capture**: Stripe Checkout integration for seamless payments
- **Address Search**: Real-time address autocomplete using Mapbox (USA & Canada)
- **AI Technician Matching**: Automatic ranking and assignment based on multiple factors

### Pipeline-Driven Workflow
- **Stage Management**: Visual progression through stages (Booked → Shooting → Editing → Delivered)
- **Kanban Board**: Drag-and-drop job management across pipeline stages
- **Task Assignment**: Assign technicians/editors to specific jobs and tasks
- **Status Transitions**: Real-time status updates with automated notifications
- **Task Tracking**: Detailed task management with notes, deadlines, and dependencies

### Media Management
- **Media Upload**: Upload high-resolution photos and videos
- **Media Preview**: Preview media before delivery
- **Client Delivery Pages**: Generate delivery pages with preview and download options
- **Media Proofing**: Client approval and revision request workflow

### Communication & Collaboration
- **Threaded Job Chat**: Every job has a dedicated chat with mentions and real-time updates
- **Live Shoot Tracking**: Real-time GPS/status updates ("On Site", "Uploading", etc.)
- **Image Annotation**: Annotate images during review
- **Instant Notifications**: Email/SMS/in-app notifications keep all stakeholders synced
- **Real-time Updates**: WebSocket-based live updates across the platform

### For Agents
- **Smart Booking Flow**: Multi-step wizard for booking photo shoots with address search
- **Job Management**: View and track all bookings in one place
- **AI Technician Matching**: Automatic ranking of technicians
- **Job Chat**: Communicate with dispatchers and technicians directly
- **Calendar View**: View all bookings in calendar format

### For Dispatchers/Project Managers
- **Intelligent Dashboard**: Overview of all jobs, metrics, and team performance
- **AI-Powered Assignment**: Rank technicians by availability, proximity, skills, and reliability
- **Live Map View**: Visualize jobs and technician locations on interactive maps
- **Audit Logging**: Complete activity tracking for compliance and transparency
- **Team Management**: Manage technician network and preferred vendor relationships
- **Kanban Board**: Visual job management with drag-and-drop functionality
- **Metrics Dashboard**: Track key performance indicators and analytics
- **Job Management View**: Detailed job management interface
- **Settings Management**: Account, personal, and product settings

### For Technicians/Technicians
- **Job Dashboard**: View upcoming and completed shoots with detailed task management
- **Profile Management**: Update services, availability, and portfolio
- **Company Applications**: Apply to join media companies and organizations
- **Performance Tracking**: Monitor ratings, reliability scores, and on-time rates
- **Rich Task Editor**: Full-featured editor for job notes and communication
- **Media Upload**: Upload raw and final media assets

## 🧠 AI Ranking Algorithm

Technicians are automatically ranked and matched to jobs using a weighted algorithm that considers:

- **Availability** (30%): Must be available on the requested date (calendar sync)
- **Preferred Relationships** (25%): Preferred vendors get priority in assignments
- **Reliability** (20%): Based on on-time rate, no-show history, and past performance
- **Distance** (15%): Proximity to job location using Haversine formula
- **Skill Match** (10%): Expertise in required media types (photography, video, aerial, twilight)

The system automatically assigns the highest-ranked available technician, with fallback logic for declines or timeouts. Agents can review assigned technicians and request reassignment if needed.

See `lib/ranking.ts` for implementation details.

## 📊 Workflow Pipeline

The frontend manages the complete media production lifecycle through a pipeline-driven workflow:

1. **Booked**: Agent creates shoot order with payment capture and calendar confirmation
2. **Shooting**: Technician assigned, captures media, uploads raw assets
3. **Editing**: Editor processes media, uploads final deliverables
4. **Delivered**: Client receives delivery page with preview and download options

Each stage transition triggers:
- Automated notifications to relevant stakeholders
- Status updates across the platform
- Real-time chat updates
- Visual updates in kanban boards and dashboards

## 🔧 Tech Stack

### Core Framework
- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (full type safety)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)

### Key Libraries
- **Maps**: Mapbox GL JS for map visualization and geocoding
- **Rich Text Editor**: Tiptap for task notes and communication
- **Charts**: Recharts for analytics and metrics visualization
- **Animations**: Framer Motion for smooth UI transitions
- **Notifications**: Sonner for toast notifications
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API for global state

### Architecture
- **Routing**: Next.js App Router with route groups and protected routes
- **Authentication**: JWT-based authentication with role-based access control
- **Real-time**: WebSocket integration for live updates and chat
- **API Integration**: RESTful API communication with backend services
- **Context Providers**: Multiple React contexts for state management (Job, Messaging, Map, Navigation)

## 📱 Responsive Design

The app is fully responsive with breakpoints at:
- Mobile: 320px+
- Tablet: 600px+
- Desktop: 1136px+ (max-width: 1280px)

## 🔐 Environment Variables

Required environment variables (create `.env.local` in the root directory):

```env
# Mapbox (Required for Maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Getting a Mapbox Token

1. Sign up for a free account at [Mapbox](https://account.mapbox.com/)
2. Navigate to your [Access Tokens](https://account.mapbox.com/access-tokens/) page
3. Copy your default public token or create a new one
4. Add it to your `.env.local` file

## 🎨 Design System

The application uses an **Uber-inspired color scheme**:
- Clean black and white aesthetic
- High contrast for readability
- Minimal color distractions
- Professional, premium feel

Customize the theme by editing `app/globals.css` (see CSS variables in `:root` and `.dark` sections).

## 📱 Responsive Design

The app is fully responsive with breakpoints at:
- **Mobile**: 320px+
- **Tablet**: 600px+
- **Desktop**: 1136px+ (max-width: 1280px)

All components are designed mobile-first and adapt seamlessly across devices.

## 🔄 State Management

The application uses React Context API for global state management:

- **JobCreationContext**: Manages job creation flow state
- **JobManagementContext**: Manages job management and updates
- **MessagingContext**: Handles real-time chat and messaging
- **DispatcherNavigationContext**: Manages dispatcher navigation state
- **map-context**: Manages map view state and interactions

## 🚀 Development

### Codebase Status

The frontend codebase has been cleaned up and is ready for backend integration:
- ✅ Removed duplicate and backup files
- ✅ Removed test/development-only files (repro.js, test-layout.js)
- ✅ Cleaned up build artifacts
- ✅ Removed empty directories
- ⏳ Mock data (`lib/mock-data.ts`) remains for development and will be replaced during backend integration

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run lint        # Run ESLint
```

### Code Organization

- **Feature-based**: Components are organized by feature (agent, dispatcher, technician)
- **Shared components**: Reusable components in `components/shared/`
- **UI components**: Design system components in `components/ui/`
- **Context providers**: Global state in `context/`
- **Custom hooks**: Reusable logic in `hooks/`

## 📚 Documentation

- [Component Structure](./components/README.md)
- [Main Project README](../../../README.md) - Complete system documentation