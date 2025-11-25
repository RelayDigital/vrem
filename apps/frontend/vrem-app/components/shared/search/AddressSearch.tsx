'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '../../ui/input';
import { Spinner } from '../../ui/spinner';
import { MapPin, Search, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { P } from '@/components/ui/typography';

interface AddressSearchProps {
  onAddressSelect: (address: string, location: { lat: number; lng: number }) => void;
}

interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: {
    accuracy?: string;
    address?: string;
    category?: string;
    maki?: string;
    wikidata?: string;
  };
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    text: string;
    wikidata?: string;
    short_code?: string;
  }>;
}

interface MapboxGeocodingResponse {
  type: string;
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export function AddressSearch({ onAddressSelect }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch predictions when query changes
  useEffect(() => {
    if (!query || query.length < 3) {
      setPredictions([]);
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError('Mapbox token not configured');
      console.warn('Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=address&country=us,ca&limit=5`;

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Geocoding request failed');
          }
          return response.json();
        })
        .then((data: MapboxGeocodingResponse) => {
          setIsLoading(false);
          setPredictions(data.features || []);
        })
        .catch((err) => {
          console.error('Geocoding error:', err);
          setIsLoading(false);
          setError('Failed to search addresses');
          setPredictions([]);
        });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePlaceSelect = useCallback(
    async (feature: MapboxFeature) => {
      setQuery(feature.place_name);
      setPredictions([]);
      setIsFocused(false);

      // Mapbox returns coordinates as [lng, lat], we need [lat, lng]
      const [lng, lat] = feature.center;
      onAddressSelect(feature.place_name, { lat, lng });
    },
    [onAddressSelect]
  );

  // Extract main text and secondary text from Mapbox feature
  const getMainText = (feature: MapboxFeature): string => {
    return feature.text || feature.place_name.split(',')[0] || '';
  };

  const getSecondaryText = (feature: MapboxFeature): string => {
    const parts = feature.place_name.split(',');
    if (parts.length > 1) {
      return parts.slice(1).join(',').trim();
    }
    return '';
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search Input */}
        <div className="relative">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <Search className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Enter property address..."
            className="h-16 pl-16 pr-6 text-lg rounded-2xl transition-all md:rounded-3xl"
            variant="muted"
            disabled={!!error}
          />
          {isLoading ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-5 top-1/2 -translate-y-1/2"
            >
              <Spinner className="h-5 w-5 text-foreground" />
            </motion.div>
          ) : (
            query && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-5 top-1/2 -translate-y-1/2"
              >
                <Sparkles className="h-5 w-5 text-foreground" />
              </motion.div>
            )
          )}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2"
          >
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <P className="text-sm text-red-800">{error}</P>
              <P className="text-xs text-destructive mt-1">
                Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file
              </P>
            </div>
          </motion.div>
        )}

        {/* Mapbox Geocoding Predictions */}
        <AnimatePresence>
          {isFocused && predictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 w-full bg-card rounded-2xl border-2 border-border shadow-2xl overflow-hidden z-50"
            >
              <div className="p-3">
                {/* <div className="text-xs text-muted-foreground/80 px-3 py-2 flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>Address suggestions from Mapbox</span>
                </div> */}
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {predictions.map((feature, index) => (
                    <motion.button
                      key={feature.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handlePlaceSelect(feature)}
                      className="w-full text-left p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/5 transition-colors">
                          <MapPin className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground font-medium">
                            {getMainText(feature)}
                          </div>
                          <div className="text-xs text-muted-foreground/80 mt-0.5 truncate">
                            {getSecondaryText(feature)}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                {/* <div className="px-3 py-2 mt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                    <span>Powered by</span>
                    <span className="font-medium text-muted-foreground">Mapbox</span>
                  </div>
                </div> */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No results message */}
        {isFocused &&
          query.length >= 3 &&
          predictions.length === 0 &&
          !isLoading &&
          !error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full mt-2 w-full bg-card rounded-2xl border-2 border-border shadow-2xl overflow-hidden z-50 p-6 text-center"
            >
              <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
              <P className="text-sm text-muted-foreground">No addresses found</P>
              <P className="text-xs text-muted-foreground/80 mt-1">Try a different search term</P>
            </motion.div>
          )}

        {/* Click outside to close */}
        {isFocused && (
          <div className="fixed inset-0 -z-10" onClick={() => setIsFocused(false)} />
        )}
      </motion.div>
    </div>
  );
}
