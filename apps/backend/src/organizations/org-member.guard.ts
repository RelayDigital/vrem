import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const orgId = req.params.orgId || req.body.orgId;

    if (!orgId) throw new ForbiddenException('Organization ID missing');

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, orgId },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to this organization');
    }

    req.membership = membership; // attach membership for controller to use
    return true;
  }
}
