# Landing Page Structure

The landing page has been segmented into modular, reusable sections for better organization and maintainability.

## 📁 File Structure

```
components/features/landing/
├── LandingPage.tsx              # Main orchestrator (75 lines)
├── index.ts                     # Barrel export
└── sections/                    # Individual page sections
    ├── index.ts                 # Section exports
    ├── HeroSection.tsx          # Hero with address search
    ├── FeaturesSection.tsx      # 6 feature cards
    ├── HowItWorksSection.tsx    # 3-step process
    ├── StatsSection.tsx         # Platform statistics
    ├── ForPhotographersSection.tsx  # Photographer benefits
    ├── ForCompaniesSection.tsx      # Media company benefits
    ├── CTASection.tsx           # Final call-to-action
    └── FooterSection.tsx        # Footer with links
```

## 📄 Section Breakdown

### 1. **HeroSection.tsx** (~50 lines)
- Main headline and value proposition
- Google Maps address search integration
- "Learn More" button
- **Props**: `onAddressSelect(address, location)`

### 2. **FeaturesSection.tsx** (~80 lines)
- Grid of 6 feature cards
- AI Matching, Instant Booking, Quality, Location, Pricing, Relationships
- Uses Card components with icons
- **Props**: None (static content)

### 3. **HowItWorksSection.tsx** (~65 lines)
- 3-step process visualization
- Step indicators with connecting dots
- Icons for each step
- **Props**: None (static content)

### 4. **StatsSection.tsx** (~40 lines)
- 4 statistics in grid
- Shoots, Photographers, Satisfaction, Availability
- Dark background section
- **Props**: None (static content)

### 5. **ForPhotographersSection.tsx** (~80 lines)
- Benefits list for photographers
- Hero image
- Rating display card
- CTA buttons
- **Props**: `onGetStarted()`, `onBookShoot()`

### 6. **ForCompaniesSection.tsx** (~85 lines)
- Benefits for media companies
- Team collaboration image
- Efficiency metrics card
- CTA buttons
- **Props**: `onGetStarted()`, `onBookShoot()`

### 7. **CTASection.tsx** (~30 lines)
- Final call-to-action
- Large "Book Now" button
- **Props**: `onBookShoot()`

### 8. **FooterSection.tsx** (~90 lines)
- 4-column footer layout
- Platform, Resources, Company links
- Copyright notice
- **Props**: None (static content)

## 🔄 Main Orchestrator (LandingPage.tsx)

The `LandingPage.tsx` file is now very clean and simple:

```typescript
export function LandingPage({ ... }) {
  const [bookingData, setBookingData] = useState(null);
  
  // Show booking flow if address selected
  if (bookingData) {
    return <AgentBookingFlow ... />;
  }
  
  // Otherwise show all landing sections
  return (
    <div>
      <HeroSection onAddressSelect={handleAddressSelect} />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <ForPhotographersSection {...} />
      <ForCompaniesSection {...} />
      <CTASection onBookShoot={handleBookShoot} />
      <FooterSection />
    </div>
  );
}
```

## ✨ Benefits

### 1. **Modularity**
- Each section is self-contained
- Easy to reorder sections
- Can be reused in other pages

### 2. **Maintainability**
- Small, focused files (30-90 lines each)
- Easy to find and edit specific sections
- Clear separation of concerns

### 3. **Testability**
- Each section can be tested independently
- Props are minimal and clear
- No complex state management in sections

### 4. **Scalability**
- Easy to add new sections
- Simple to A/B test different sections
- Can lazy-load sections if needed

### 5. **Developer Experience**
- Quick to understand structure
- Easy to onboard new developers
- Clear file naming conventions

## 🎯 Usage

### Editing a Section
1. Navigate to `components/features/landing/sections/`
2. Find the section you want to edit
3. Make changes
4. All sections use theme variables (no hardcoded colors)

### Adding a New Section
1. Create new file in `sections/` folder
2. Export from `sections/index.ts`
3. Import and render in `LandingPage.tsx`

### Reordering Sections
Simply change the order in `LandingPage.tsx`:
```typescript
return (
  <div>
    <HeroSection />
    <StatsSection />      {/* Moved up */}
    <FeaturesSection />    {/* Moved down */}
    {/* ... */}
  </div>
);
```

## 🎨 Theme Consistency

All sections use shadcn theme variables:
- `bg-card`, `bg-background`, `bg-muted`, `bg-primary`
- `text-foreground`, `text-muted-foreground`, `text-primary-foreground`
- `border-border`, `border-ring`

No hardcoded colors = Easy theme changes!
