import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserAccountType } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashed,
        accountType: dto.accountType,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRole(role: UserAccountType) {
    return this.prisma.user.findMany({
      where: { accountType: role },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.findOne(id);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    // If name changed, update personal organization name to "<User Name>'s Workspace"
    if (dto.name && dto.name !== existing.name) {
      const personalMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: id,
          role: 'OWNER',
          organization: { type: 'PERSONAL' },
        },
        include: { organization: true },
      });

      if (personalMembership?.organization) {
        await this.prisma.organization.update({
          where: { id: personalMembership.organization.id },
          data: {
            name: `${dto.name}'s Workspace`,
          },
        });
      }
    }

    return updatedUser;
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
