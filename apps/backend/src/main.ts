import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OrgContextGuard } from './auth/org-context.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
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

  // OpenAPI / Swagger setup (disabled in production for security)
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VREM API')
    .setDescription('VX Real Estate Media — Backend API Reference')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addApiKey(
      { type: 'apiKey', name: 'x-org-id', in: 'header' },
      'x-org-id',
    )
    .addTag('App', 'Health check')
    .addTag('Auth', 'Authentication & session management')
    .addTag('OTP', 'One-time password verification')
    .addTag('Onboarding', 'User onboarding flow')
    .addTag('Users', 'User management')
    .addTag('Organizations', 'Organization management')
    .addTag('Projects', 'Project CRUD & workflow')
    .addTag('Orders', 'Order management')
    .addTag('Customers', 'Customer management')
    .addTag('Messages', 'In-app messaging')
    .addTag('Inquiries', 'Public inquiry forms')
    .addTag('Media', 'Media file management')
    .addTag('Dashboard', 'Dashboard metrics & analytics')
    .addTag('Notifications', 'Notification management')
    .addTag('Packages', 'Service packages & add-ons')
    .addTag('Availability', 'Scheduling & availability')
    .addTag('Cronofy', 'Cronofy calendar integration')
    .addTag('Delivery', 'Project delivery & public galleries')
    .addTag('Tours', 'Virtual tour management')
    .addTag('Nylas', 'Nylas email integration')
    .addTag('Calendar', 'ICS calendar feeds')
    .addTag('Invoices', 'Invoice management')
    .addTag('Stripe', 'Stripe payments & webhooks')
    .build();

  if (!isProduction) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
    logger.log('Swagger API docs available at /api');
  }

  // Global validation pipe - ensures all DTOs are validated
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip properties not in DTO
      forbidNonWhitelisted: false, // Don't throw on extra properties (lenient)
      transform: true,            // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter - sanitizes errors in production
  app.useGlobalFilters(new AllExceptionsFilter());

  // Security headers (minimal, production-safe)
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(OrgContextGuard));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
