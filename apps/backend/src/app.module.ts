import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MediaModule } from './media/media.module';


@Module({
  imports: [UsersModule, AuthModule, ProjectsModule, MediaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
