import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DeliveryModule } from './delivery/delivery.module';
import { StripeModule } from './stripe/stripe.module';
import { PackagesModule } from './packages/packages.module';
import { CalendarIntegrationsModule } from './calendar-integrations/calendar-integrations.module';
import { AvailabilityModule } from './availability/availability.module';
import { NylasModule } from './nylas/nylas.module';
import { OtpModule } from './otp/otp.module';
import { EmailModule } from './email/email.module';
import { ToursModule } from './tours/tours.module';
import { OrgRolesGuard } from './auth/org-roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { THROTTLE_CONFIG } from './config/throttle.config';

@Module({
  imports: [
    ThrottlerModule.forRoot(THROTTLE_CONFIG),
    PrismaModule,
    EmailModule,
    UsersModule,
    AuthModule,
    OtpModule,
    ProjectsModule,
    MediaModule,
    MessagesModule,
    InquiriesModule,
    DashboardModule,
    OrganizationsModule,
    CustomersModule,
    OrdersModule,
    NotificationsModule,
    DeliveryModule,
    StripeModule,
    PackagesModule,
    CalendarIntegrationsModule,
    AvailabilityModule,
    NylasModule,
    ToursModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ActiveOrgMiddleware,
    OrgRolesGuard,
    JwtAuthGuard,
    Reflector,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActiveOrgMiddleware).forRoutes('*');
  }
}
