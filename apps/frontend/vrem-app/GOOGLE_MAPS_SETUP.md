# Google Maps API Setup Guide

## Overview
The VX Media app uses Google Maps API for real-time address autocomplete and geocoding functionality.

## Required APIs
You need to enable the following APIs in Google Cloud Console:
1. **Maps JavaScript API** - For loading the maps library
2. **Places API** - For address autocomplete suggestions
3. **Geocoding API** - For converting addresses to coordinates

## Setup Instructions

### Step 1: Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **API Key**
5. Copy your new API key

### Step 2: Enable Required APIs

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable each of these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API

### Step 3: Restrict Your API Key (Recommended)

1. Go to **APIs & Services** > **Credentials**
2. Click on your API key
3. Under **Application restrictions**:
   - Select **HTTP referrers (web sites)**
   - Add your domains:
     ```
     http://localhost:3000/*
     https://yourdomain.com/*
     ```
4. Under **API restrictions**:
   - Select **Restrict key**
   - Choose:
     - Maps JavaScript API
     - Places API
     - Geocoding API

### Step 4: Add API Key to Your Project

1. Create a `.env.local` file in the root of `vrem-app/`
2. Add your API key:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...your_actual_key_here
   ```
3. Restart your dev server

### Step 5: Test the Integration

1. Start the dev server: `npm run dev`
2. Click "Log In" (demo mode)
3. Switch to "Agent" role
4. Click "New Booking"
5. Start typing an address - you should see Google autocomplete suggestions!

## Usage in Code

The `AddressSearch` component automatically loads and uses the Google Maps API:

```typescript
<AddressSearch 
  onAddressSelect={(address, location) => {
    console.log('Selected:', address);
    console.log('Coordinates:', location.lat, location.lng);
  }}
/>
```

## Features

- ✅ Real-time address autocomplete
- ✅ US address filtering
- ✅ Automatic geocoding (address → lat/lng)
- ✅ Error handling and loading states
- ✅ Beautiful animations
- ✅ Fallback message if API key is missing

## Pricing

Google Maps Platform offers:
- **$200 free credit** per month
- Places Autocomplete: ~$2.83 per 1,000 requests
- Geocoding: ~$5 per 1,000 requests

For most applications, the free tier is sufficient for development and moderate production use.

## Troubleshooting

### "Google Maps API key not configured"
- Make sure `.env.local` exists
- Verify the key name is exactly `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Restart your dev server after adding the key

### No suggestions appearing
- Check that Places API is enabled in Google Cloud Console
- Verify your API key has Places API access
- Check browser console for errors

### "Failed to load Google Maps"
- Ensure Maps JavaScript API is enabled
- Check that your API key is valid
- Verify your domain is allowed (if using HTTP referrer restrictions)

## Development Mode

If you don't have an API key yet, the component will show a helpful error message with instructions. The rest of the app will continue to work normally.

