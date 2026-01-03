/**
 * Environment variable validation for production readiness.
 * Called at application startup to fail fast if critical vars are missing.
 */

import { Logger } from '@nestjs/common';

interface EnvVarConfig {
  name: string;
  required: boolean;
  requiredInProduction: boolean;
  description: string;
}

const ENV_VARS: EnvVarConfig[] = [
  // Critical - App won't function
  {
    name: 'DATABASE_URL',
    required: true,
    requiredInProduction: true,
    description: 'PostgreSQL connection string',
  },
  {
    name: 'CLERK_SECRET_KEY',
    required: true,
    requiredInProduction: true,
    description: 'Clerk authentication secret key',
  },
  {
    name: 'JWT_SECRET',
    required: false,
    requiredInProduction: true,
    description: 'Secret for signing JWT tokens (required in production)',
  },

  // Email - Required for user flows
  {
    name: 'RESEND_API_KEY',
    required: false,
    requiredInProduction: true,
    description: 'Resend API key for sending emails',
  },

  // Storage - Required for media features
  {
    name: 'UPLOADCARE_PUBLIC_KEY',
    required: false,
    requiredInProduction: true,
    description: 'Uploadcare public key for file uploads',
  },
  {
    name: 'UPLOADCARE_PRIVATE_KEY',
    required: false,
    requiredInProduction: true,
    description: 'Uploadcare private key for file operations',
  },
  {
    name: 'UPLOADCARE_CDN_BASE',
    required: false,
    requiredInProduction: true,
    description: 'Uploadcare CDN base URL',
  },

  // Payments - Required if using Stripe
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    requiredInProduction: false,
    description: 'Stripe secret key (optional, enables payments)',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    requiredInProduction: false,
    description: 'Stripe webhook signing secret (required if using Stripe)',
  },

  // URLs
  {
    name: 'FRONTEND_URL',
    required: false,
    requiredInProduction: true,
    description: 'Frontend application URL for CORS and email links',
  },
];

export function validateEnvironment(): void {
  const logger = new Logger('EnvValidation');
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_VARS) {
    const value = process.env[config.name];
    const isEmpty = !value || value.trim() === '';

    if (config.required && isEmpty) {
      errors.push(`Missing required env var: ${config.name} - ${config.description}`);
    } else if (isProduction && config.requiredInProduction && isEmpty) {
      errors.push(`Missing production-required env var: ${config.name} - ${config.description}`);
    } else if (isEmpty && config.requiredInProduction) {
      warnings.push(`Missing env var (will be required in production): ${config.name}`);
    }
  }

  // Special validations
  if (!isProduction && !process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET not set - using insecure default. Set it before deploying to production.');
  }

  // Stripe consistency check
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing. Webhooks will fail.');
  }

  // Log warnings
  for (const warning of warnings) {
    logger.warn(warning);
  }

  // Fail on errors
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    for (const error of errors) {
      logger.error(`  - ${error}`);
    }
    throw new Error(`Environment validation failed with ${errors.length} error(s). See logs above.`);
  }

  logger.log('Environment validation passed');
}
