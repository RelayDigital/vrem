import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OrgContextGuard } from './auth/org-context.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(OrgContextGuard));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
