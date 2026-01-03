import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth-context';

/**
 * Guard that allows:
 * - The linked customer for the project
 * - Org members with OWNER/ADMIN/PROJECT_MANAGER role
 *
 * Used for delivery comments where both customers and ops team can participate.
 */
@Injectable()
export class DeliveryCommentGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const token = request.params.token;

    // Must be authenticated
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Must have a token
    if (!token) {
      throw new ForbiddenException('Invalid delivery token');
    }

    // Find the project by delivery token
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: { customer: true },
    });

    if (!project) {
      throw new ForbiddenException('Delivery not found or invalid token');
    }

    // Check if user is the linked customer
    if (project.customer?.userId === user.id) {
      request.deliveryProject = project;
      return true;
    }

    // Check if user is an org member with appropriate role
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        orgId: project.orgId,
        role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] },
      },
    });

    if (membership) {
      request.deliveryProject = project;
      return true;
    }

    throw new ForbiddenException('You do not have permission to comment on this delivery');
  }
}
