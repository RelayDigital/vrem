import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OrgContextGuard } from './auth/org-context.guard';
import { FRONTEND_URL } from './config/urls.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhook verification
  });

  // Build list of allowed origins
  const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  // Add ngrok URL if configured
  const ngrokUrl = process.env.PRODUCTION_API_URL;
  if (ngrokUrl) {
    allowedOrigins.push(ngrokUrl);
  }

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
      // Allow any localhost origin in development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      // Allow ngrok origins
      if (origin.includes('ngrok')) {
        return callback(null, true);
      }
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-org-id',
      'ngrok-skip-browser-warning', // Required for ngrok free tier
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(OrgContextGuard));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
