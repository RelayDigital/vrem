import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { OrgRole, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
  // Fetch global user role
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) throw new NotFoundException('User not found');

  // ENFORCEMENT: only global ADMIN can create organizations
  if (user.role !== Role.ADMIN) {
    throw new ForbiddenException(
      'Only ADMIN users can create a media company',
    );
  }

  // Create the organization
  const org = await this.prisma.organization.create({
    data: { name: dto.name },
  });

  // Make the creator an OrgRole.ADMIN
  await this.prisma.organizationMember.create({
    data: {
      userId,
      orgId: org.id,
      role: OrgRole.ADMIN,
    },
  });

  return org;
}


  async listUserOrganizations(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });
  }

  async createInvite(orgId: string, dto: CreateInviteDto, inviterId: string) {
    // Ensure org exists
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const token = randomUUID();

    return this.prisma.invitation.create({
      data: {
        orgId,
        email: dto.email,
        role: dto.role,
        token,
      },
    });
  }

  async acceptInvite(userId: string, dto: AcceptInviteDto) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invite.accepted) return invite;

    // Check if already a member
    const existing = await this.prisma.organizationMember.findFirst({
      where: { userId, orgId: invite.orgId },
    });

    if (!existing) {
      await this.prisma.organizationMember.create({
        data: {
          userId,
          orgId: invite.orgId,
          role: invite.role,
        },
      });
    }

    await this.prisma.invitation.update({
      where: { id: invite.id },
      data: { accepted: true },
    });

    return invite;
  }
}
