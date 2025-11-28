import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
