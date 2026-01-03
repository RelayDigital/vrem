/**
 * Rate limiting configuration for public endpoints.
 * Uses NestJS Throttler module with tiered limits based on endpoint sensitivity.
 */

import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Default rate limit tiers for different endpoint types.
 * These can be overridden per-route using @Throttle() decorator.
 */
export const THROTTLE_CONFIG: ThrottlerModuleOptions = {
  throttlers: [
    {
      // Short window for burst protection
      name: 'short',
      ttl: 1000, // 1 second
      limit: 3,  // 3 requests per second
    },
    {
      // Medium window for general rate limiting
      name: 'medium',
      ttl: 10000, // 10 seconds
      limit: 20,   // 20 requests per 10 seconds
    },
    {
      // Long window for sensitive operations
      name: 'long',
      ttl: 60000, // 1 minute
      limit: 100,  // 100 requests per minute
    },
  ],
};

/**
 * Rate limit presets for different endpoint types.
 * Use with @Throttle({ [presetName]: { ttl, limit } })
 */
export const RATE_LIMIT_PRESETS = {
  // Auth endpoints - strict limits to prevent brute force
  auth: { ttl: 60000, limit: 5 },      // 5 attempts per minute

  // Registration/signup - prevent spam accounts
  register: { ttl: 60000, limit: 3 },  // 3 registrations per minute per IP

  // Public form submissions
  inquiry: { ttl: 60000, limit: 10 },  // 10 inquiries per minute

  // Download endpoints - prevent abuse
  download: { ttl: 60000, limit: 5 },  // 5 download requests per minute per token

  // General API calls
  api: { ttl: 60000, limit: 60 },      // 60 requests per minute (1/sec avg)
};
