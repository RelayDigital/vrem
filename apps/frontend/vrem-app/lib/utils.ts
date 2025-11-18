import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format address for display based on user role.
 * @param address - The address object with structured fields
 * @param showFull - If true, returns the full address. If false, returns only city, state/province, and country.
 * @returns The formatted address string
 */
export function getLocationDisplay(
  address: { street?: string; city: string; stateProvince: string; country: string; postalCode?: string },
  showFull: boolean = false
): string {
  if (showFull) {
    // Full address: street, city, state/province, postalCode, country
    const parts: string[] = [];
    if (address.street) parts.push(address.street);
    parts.push(address.city);
    parts.push(address.stateProvince);
    if (address.postalCode) parts.push(address.postalCode);
    parts.push(address.country);
    return parts.join(', ');
  }
  // Non-confidential: only city, state/province, and country
  return `${address.city}, ${address.stateProvince}, ${address.country}`;
}
