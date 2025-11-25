import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MediaModule } from './media/media.module';
import { MessagesModule } from './messages/messages.module';
import { InquiriesModule } from './inquiries/inquires.module';
import { DashboardModule } from './dashboard/dashboard.module';


@Module({
  imports: [UsersModule, AuthModule, ProjectsModule, MediaModule, MessagesModule, InquiriesModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
