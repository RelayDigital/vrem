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
import { CustomersModule } from './customers/customers.module';
import { OrgRolesGuard } from './auth/org-roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
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
  providers: [AppService, ActiveOrgMiddleware, OrgRolesGuard, JwtAuthGuard, Reflector],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActiveOrgMiddleware).forRoutes('*');
  }
}
