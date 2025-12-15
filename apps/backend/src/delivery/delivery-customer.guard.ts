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
 * Guard that ensures the authenticated user is the linked customer
 * for the project identified by the delivery token.
 *
 * Requires:
 * - User is authenticated (req.user populated)
 * - Token param matches a project with a linked customer
 * - User is the linked customer (customer.userId === user.id)
 */
@Injectable()
export class DeliveryCustomerGuard implements CanActivate {
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
    if (!project.customer?.userId) {
      throw new ForbiddenException('This delivery has no linked customer');
    }

    if (project.customer.userId !== user.id) {
      throw new ForbiddenException('Only the customer can perform this action');
    }

    // Attach project to request for use in controller/service
    request.deliveryProject = project;

    return true;
  }
}
