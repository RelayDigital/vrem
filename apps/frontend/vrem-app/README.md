# VX Media - Photography Operations Platform

A modern, AI-powered photography booking and dispatch platform built with Next.js 16 and shadcn/ui.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Mapbox (Required for Maps)

The application uses Mapbox GL JS for map visualization and location services.

1. Get a Mapbox access token from [Mapbox Account](https://account.mapbox.com/)
2. Create a `.env.local` file in the root:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token
   ```

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
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles & theme variables
│
├── components/
│   ├── VremApp.tsx        # Main application wrapper
│   │
│   ├── features/          # Feature-specific components
│   │   ├── agent/         # Agent booking & jobs view
│   │   ├── dispatcher/    # Dispatcher dashboard & management
│   │   ├── photographer/  # Photographer dashboard & profile
│   │   └── landing/       # Marketing landing page
│   │
│   ├── shared/            # Reusable components
│   │   ├── jobs/         # Job cards & forms
│   │   ├── tasks/        # Job task management
│   │   ├── search/       # Address search & filters
│   │   ├── map/          # Map visualization
│   │   ├── metrics/      # Analytics components
│   │   ├── kanban/       # Kanban board
│   │   └── chat/         # Job chat functionality
│   │
│   ├── ui/               # shadcn/ui design system
│   └── common/           # Common utilities
│
├── lib/                   # Utilities & helpers
│   ├── mock-data.ts      # Sample data
│   ├── ranking.ts        # AI ranking algorithm
│   └── utils.ts          # Utility functions
│
└── types/                # TypeScript type definitions
    └── index.ts
```

## ✨ Features

### For Agents
- **Smart Booking Flow**: Multi-step wizard for booking photo shoots
- **Job Management**: View and track all your bookings
- **Address Search**: Real-time address autocomplete (USA & Canada)
- **AI Photographer Matching**: Automatic ranking based on multiple factors
- **Job Chat**: Communicate with dispatchers and photographers

### For Dispatchers
- **Intelligent Dashboard**: Overview of all jobs and metrics
- **AI-Powered Assignment**: Rank photographers by availability, proximity, skills
- **Live Map View**: Visualize jobs and photographer locations on interactive maps
- **Audit Logging**: Complete activity tracking
- **Team Management**: Manage photographer network and preferred vendors
- **Kanban Board**: Visual job management with drag-and-drop
- **Metrics Dashboard**: Track KPIs and analytics

### For Photographers
- **Job Dashboard**: View upcoming and completed shoots
- **Task Management**: Rich text editor for job notes and communication
- **Profile Management**: Update services, availability, and portfolio
- **Company Applications**: Apply to join media companies
- **Performance Tracking**: See your ratings and reliability scores

## 🎨 Design System

The app uses an **Uber-inspired color scheme**:
- Clean black and white aesthetic
- High contrast for readability
- Minimal color distractions
- Professional, premium feel

Customize the theme by editing `app/globals.css` (see CSS variables in `:root` and `.dark` sections).

## 🧠 AI Ranking Algorithm

Photographers are ranked using a weighted algorithm:
- **Availability** (30%): Must be available on requested date
- **Preferred Relationships** (25%): Preferred vendors get priority
- **Reliability** (20%): Based on on-time rate and no-show history
- **Distance** (15%): Proximity to job location
- **Skill Match** (10%): Expertise in required media types

See `lib/ranking.ts` for implementation details.

## 🔧 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Maps**: Mapbox GL JS
- **Charts**: Recharts
- **Notifications**: Sonner
- **TypeScript**: Full type safety

## 📱 Responsive Design

The app is fully responsive with breakpoints at:
- Mobile: 320px+
- Tablet: 600px+
- Desktop: 1136px+ (max-width: 1280px)

## 🎭 Demo Mode

The app includes a demo mode with three user roles:
- **Agent** (Emily Rodriguez): Book photo shoots
- **Dispatcher** (Sarah Chen): Manage assignments
- **Photographer** (Marcus Rodriguez): View and manage jobs

Switch between roles using the dropdown in the header.

## 📚 Documentation

- [Component Structure](./components/README.md)

## 🔐 Environment Variables

Required environment variables (create `.env.local`):
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token
```