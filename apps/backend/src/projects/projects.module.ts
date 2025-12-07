import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CronofyModule } from '../cronofy/cronofy.module';
import { MediaModule } from '../media/media.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [CronofyModule, MediaModule, AuthModule],
  providers: [ProjectsService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
