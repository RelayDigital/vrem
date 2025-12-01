import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyModule } from '../cronofy/cronofy.module';

@Module({
  imports: [CronofyModule],
  providers: [ProjectsService, PrismaService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
