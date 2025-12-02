import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MediaModule } from './media/media.module';
import { MessagesModule } from './messages/messages.module';
import { InquiriesModule } from './inquiries/inquires.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ActiveOrgMiddleware } from './organizations/active-org.middleware';
import { PrismaService } from './prisma/prisma.service';
import { CustomersModule } from './customers/customers.module';
import { RolesGuard } from './auth/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ProjectsModule,
    MediaModule,
    MessagesModule,
    InquiriesModule,
    DashboardModule,
    OrganizationsModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, ActiveOrgMiddleware, RolesGuard, JwtAuthGuard, Reflector],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActiveOrgMiddleware).forRoutes('*');
  }
}
