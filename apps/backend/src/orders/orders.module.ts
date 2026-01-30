import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CronofyModule } from '../cronofy/cronofy.module';
import { StripeModule } from '../stripe/stripe.module';
import { PackagesModule } from '../packages/packages.module';
import { NylasModule } from '../nylas/nylas.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, AuthModule, CronofyModule, StripeModule, PackagesModule, NylasModule, EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

