# VX Media - Photography Operations Platform

A modern, AI-powered photography booking and dispatch platform built with Next.js 16 and shadcn/ui.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google Maps API (Required for Address Search)

The application uses Google Maps for real-time address autocomplete.

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Create a `.env.local` file in the root:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

See [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) for detailed instructions.

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
│   │   ├── search/       # Address search & filters
│   │   ├── metrics/      # Analytics components
│   │   └── map/          # Map visualization
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
- **Google Address Search**: Real-time address autocomplete (USA & Canada)
- **AI Photographer Matching**: Automatic ranking based on multiple factors

### For Dispatchers
- **Intelligent Dashboard**: Overview of all jobs and metrics
- **AI-Powered Assignment**: Rank photographers by availability, proximity, skills
- **Live Map View**: Visualize jobs and photographer locations
- **Audit Logging**: Complete activity tracking
- **Team Management**: Manage photographer network

### For Photographers
- **Job Dashboard**: View upcoming and completed shoots
- **Profile Management**: Update services and availability
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
- **Maps**: Google Maps JavaScript API
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

- [Google Maps Setup Guide](./GOOGLE_MAPS_SETUP.md)
- [Component Structure](./components/README.md)

## 🔐 Environment Variables

Required environment variables (create `.env.local`):
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

See `ENV_TEMPLATE.txt` for the template.

## 🚢 Deployment

The app can be deployed to any Next.js hosting provider:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted

Make sure to add your environment variables to your hosting platform.

## 📄 License

Copyright © 2025 VX Media Operations
