import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OrgContextGuard } from './auth/org-context.guard';
import { FRONTEND_URL } from './config/urls.config';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment variables before starting
  validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhook verification
  });

  // Build list of allowed origins
  const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  // Add production frontend URL if configured
  const productionFrontendUrl = process.env.PRODUCTION_FRONTEND_URL;
  if (productionFrontendUrl) {
    allowedOrigins.push(productionFrontendUrl);
  }

  // Add any additional allowed origins from env (comma-separated)
  const additionalOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean);
  if (additionalOrigins) {
    allowedOrigins.push(...additionalOrigins);
  }

  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      // Allow if origin is in our list
      if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
        return callback(null, true);
      }
      // Allow Vercel preview deployments (*.vercel.app)
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      // Allow Amplify deployments (*.amplifyapp.com)
      if (origin.endsWith('.amplifyapp.com')) {
        return callback(null, true);
      }
      // Allow any localhost origin in development only
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-org-id',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(OrgContextGuard));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
