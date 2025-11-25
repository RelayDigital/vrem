import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(
    email: string,
    name: string,
    password: string,
    role: Role
  ) {
    // VALIDATION: role must be one of the defined global roles
    const allowedRoles: Role[] = [
      Role.ADMIN,
      Role.PROJECT_MANAGER,
      Role.TECHNICIAN,
      Role.EDITOR,
      Role.AGENT,
    ];

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Invalid role selection');
    }

    // Check unique email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already registered');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with global role
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role, // IMPORTANT: global identity role
      },
    });

    // Create JWT
    const token = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    return { user, token };
  }


  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user.id, role: user.role });
    return { user, token };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
