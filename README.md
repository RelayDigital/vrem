# VREM - Photography Operations Platform

VREM is a modern, AI-powered photography booking and dispatch platform designed for real estate photography operations. It connects real estate agents with photographers, streamlines job assignments, and optimizes photographer matching using intelligent algorithms.

## 🎯 Overview

VREM is a full-stack application that facilitates the end-to-end workflow of real estate photography operations:

- **Agents** can book photo shoots with intelligent photographer matching
- **Dispatchers** can manage job assignments, track metrics, and optimize photographer allocation
- **Photographers** can manage their jobs, profiles, and apply to join media companies

The platform uses AI-powered ranking algorithms to match photographers to jobs based on availability, proximity, reliability, skills, and preferred vendor relationships.

## 🏗️ Architecture

VREM is built as a monorepo with the following structure:

```
vrem/
├── apps/
│   ├── frontend/          # Next.js 16 frontend application
│   │   └── vrem-app/      # Main frontend app
│   └── backend/           # NestJS backend API
├── docker-compose.yml     # Docker services (PostgreSQL, Redis)
└── README.md             # This file
```

## ✨ Key Features

### For Real Estate Agents
- **Smart Booking Flow**: Multi-step wizard for booking photo shoots with address search
- **Job Management**: View and track all bookings in one place
- **AI Photographer Matching**: Automatic ranking of photographers based on multiple factors
- **Real-time Address Search**: Google Maps integration for USA & Canada address autocomplete
- **Job Chat**: Communicate with dispatchers and photographers directly

### For Dispatchers
- **Intelligent Dashboard**: Overview of all jobs, metrics, and team performance
- **AI-Powered Assignment**: Rank photographers by availability, proximity, skills, and reliability
- **Live Map View**: Visualize jobs and photographer locations on an interactive map
- **Audit Logging**: Complete activity tracking for compliance and transparency
- **Team Management**: Manage photographer network and preferred vendor relationships
- **Kanban Board**: Visual job management with drag-and-drop functionality
- **Metrics Dashboard**: Track key performance indicators and analytics

### For Photographers
- **Job Dashboard**: View upcoming and completed shoots with detailed task management
- **Profile Management**: Update services, availability, and portfolio
- **Company Applications**: Apply to join media companies and organizations
- **Performance Tracking**: Monitor ratings, reliability scores, and on-time rates
- **Rich Task Editor**: Full-featured editor for job notes and communication

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
- **Authentication**: Role-based access control (Admin, Project Manager, Technician, Editor, Agent)
- **API**: RESTful API architecture

### Infrastructure
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Containerization**: Docker Compose

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

Photographers are ranked using a weighted algorithm that considers:

- **Availability** (30%): Must be available on the requested date
- **Preferred Relationships** (25%): Preferred vendors get priority
- **Reliability** (20%): Based on on-time rate and no-show history
- **Distance** (15%): Proximity to job location (Haversine formula)
- **Skill Match** (10%): Expertise in required media types (photography, video, aerial, twilight)

See `apps/frontend/vrem-app/lib/ranking.ts` for implementation details.

## 📁 Project Structure

### Frontend (`apps/frontend/vrem-app/`)
```
vrem-app/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles & theme variables
│
├── components/
│   ├── VremApp.tsx        # Main application orchestrator
│   │
│   ├── features/          # Feature-specific components
│   │   ├── agent/         # Agent booking & jobs view
│   │   ├── dispatcher/    # Dispatcher dashboard & management
│   │   ├── photographer/  # Photographer dashboard & profile
│   │   └── landing/       # Marketing landing page
│   │
│   ├── shared/            # Reusable components
│   │   ├── jobs/         # Job cards, forms, and lists
│   │   ├── tasks/        # Job task management
│   │   ├── search/       # Address search & filters
│   │   ├── map/          # Map visualization
│   │   ├── metrics/      # Analytics components
│   │   ├── kanban/       # Kanban board
│   │   └── chat/         # Job chat functionality
│   │
│   ├── ui/               # shadcn/ui design system
│   └── common/           # Common utilities and cards
│
├── lib/                   # Utilities & helpers
│   ├── mock-data.ts      # Sample data for development
│   ├── ranking.ts        # AI ranking algorithm
│   └── utils.ts          # Utility functions
│
└── types/                # TypeScript type definitions
    ├── index.ts          # Main type definitions
    └── chat.ts           # Chat-related types
```

### Backend (`apps/backend/`)
```
backend/
├── src/
│   ├── main.ts           # Application entry point
│   ├── app.module.ts     # Root module
│   ├── users/            # User management module
│   └── prisma/           # Prisma service
│
└── prisma/
    └── schema.prisma     # Database schema
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
```

### Backend (`.env`)
```env
DATABASE_URL="postgresql://vrem_user:vrem_pass@localhost:5432/vrem"
PORT=3001
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

## 🚢 Deployment

### Frontend
The frontend can be deployed to any Next.js hosting provider:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted

### Backend
The backend can be deployed to:
- AWS (EC2, ECS, Lambda)
- Google Cloud Platform
- Azure
- Heroku
- Self-hosted servers

### Database
Ensure PostgreSQL and Redis are available in your deployment environment. Consider using managed services:
- AWS RDS (PostgreSQL)
- AWS ElastiCache (Redis)
- Google Cloud SQL
- Azure Database

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

## 🔗 Related Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)

