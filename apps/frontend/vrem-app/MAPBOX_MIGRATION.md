# Mapbox GL JS Migration Guide

This document outlines the migration from Google Maps to Mapbox GL JS.

## Environment Variables

Replace in `.env.local`:
- Remove: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Add: `NEXT_PUBLIC_MAPBOX_TOKEN` (get from https://account.mapbox.com/access-tokens/)

## Key Changes

### 1. Map Initialization
- **Before**: Google Maps script loader with callback
- **After**: Mapbox GL JS with access token

### 2. Markers
- **Before**: `google.maps.Marker` with custom icon objects
- **After**: `mapboxgl.Marker` with HTML elements or custom images

### 3. Popups/InfoWindows
- **Before**: `google.maps.InfoWindow`
- **After**: `mapboxgl.Popup` with HTML content

### 4. Bounds & Auto-fit
- **Before**: `google.maps.LatLngBounds` with `fitBounds()`
- **After**: `mapboxgl.LngLatBounds` with `fitBounds()`

### 5. Directions & Polylines
- **Before**: Google Directions Service with `google.maps.Polyline`
- **After**: Mapbox Directions API with GeoJSON source and line layer

### 6. Address Search
- **Before**: Google Places Autocomplete API
- **After**: Mapbox Geocoding API (forward geocoding)

## Files Changed

1. `components/shared/map/MapView.tsx` - Complete rewrite for Mapbox
2. `components/shared/search/AddressSearch.tsx` - Updated to use Mapbox Geocoding
3. `context/map-context.tsx` - New context for Mapbox map instance
4. `lib/mapbox/provider.tsx` - New provider component

## Testing Checklist

- [ ] Map loads and displays correctly
- [ ] All markers appear with correct icons
- [ ] Popups show correct information
- [ ] Auto-fit bounds works for all markers
- [ ] Animated polyline shows between photographer and job
- [ ] Address search works with autocomplete
- [ ] Legend displays correctly
- [ ] Error states handle missing API key
- [ ] Loading states display correctly

