import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PrismaService } from '../prisma/prisma.service';
import { OrgMemberGuard } from './org-member.guard';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaService, OrgMemberGuard],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
