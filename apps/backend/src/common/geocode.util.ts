/**
 * Utility for geocoding addresses using Mapbox API
 */

interface GeocodedLocation {
  lat: number;
  lng: number;
}

interface AddressComponents {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

export function buildAddressString(address: AddressComponents): string {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.region,
    address.postalCode,
    address.countryCode,
  ].filter(Boolean);
  return parts.join(', ');
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodedLocation | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token || !address) {
    return null;
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address,
    )}.json?access_token=${token}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Geocoding failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const feature = data?.features?.[0];

    if (feature?.center?.length === 2) {
      const [lng, lat] = feature.center;
      return { lat, lng };
    }
  } catch (error) {
    console.error('Failed to geocode address:', error);
  }

  return null;
}

/**
 * Geocodes an address from its components.
 * Returns null if the address is empty or geocoding fails.
 */
export async function geocodeAddressComponents(
  address: AddressComponents,
): Promise<GeocodedLocation | null> {
  const addressString = buildAddressString(address);
  if (!addressString) {
    return null;
  }
  return geocodeAddress(addressString);
}
