import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { buildPrismaClientOptions } from './prisma.client-config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super(buildPrismaClientOptions());
    this.logger.log('Instantiating PrismaService (shared PrismaClient)');
  }

  async onModuleInit() {
    this.logger.log('PrismaService onModuleInit invoked; connecting to database');
    await this.$connect();
    this.logger.log('Prisma connected to Supabase database');
    // Echo to stdout so it is visible even if Nest logger levels are filtered
    console.log('Prisma connected to Supabase database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from Supabase database');
  }
}
