/**
 * URL Configuration
 *
 * Resolves frontend and API URLs based on the USE_PRODUCTION_URLS toggle.
 * This allows easy switching between local development and production URLs.
 */

const USE_PRODUCTION_URLS = process.env.USE_PRODUCTION_URLS === 'true';

// Frontend URL resolution
const LOCAL_FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PROD_FRONTEND_URL = process.env.PRODUCTION_FRONTEND_URL || '';

// API URL resolution
const LOCAL_API_URL = process.env.API_URL || 'http://localhost:3001';
const PROD_API_URL = process.env.PRODUCTION_API_URL || '';

/**
 * Get the frontend URL based on environment configuration
 */
export function getFrontendUrl(): string {
  if (USE_PRODUCTION_URLS && PROD_FRONTEND_URL) {
    return PROD_FRONTEND_URL;
  }
  return LOCAL_FRONTEND_URL;
}

/**
 * Get the API/backend URL based on environment configuration
 */
export function getApiUrl(): string {
  if (USE_PRODUCTION_URLS && PROD_API_URL) {
    return PROD_API_URL;
  }
  return LOCAL_API_URL;
}

/**
 * Check if production URLs are enabled
 */
export function isProductionMode(): boolean {
  return USE_PRODUCTION_URLS;
}

// Export resolved URLs for direct access
export const FRONTEND_URL = getFrontendUrl();
export const API_URL = getApiUrl();
