import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  private readonly logger = new Logger(OrgMemberGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    
    // If middleware already validated membership, we're good
    if (req.activeOrgMembership) {
      req.membership = req.activeOrgMembership;
      return true;
    }

    // Ensure user is authenticated
    const user = req.user;
    if (!user || !user.id) {
      this.logger.warn('OrgMemberGuard: User not authenticated');
      throw new UnauthorizedException('Authentication required');
    }

    // Check params, body, activeOrgId (from middleware), or header
    // Use optional chaining to safely access potentially undefined objects
    const orgId = req.params?.orgId || req.body?.orgId || req.activeOrgId || req.headers?.['x-org-id'];

    // AGENTS: Allow agents to proceed without orgId (they may not be org members)
    // They can access their own projects by agentId
    if (!orgId) {
      // Check if this is an agent - agents can work without org membership
      if (user.role === 'AGENT') {
        this.logger.debug(`OrgMemberGuard: Agent ${user.id} accessing without orgId - allowing`);
        req.membership = null; // No membership, but that's OK for agents
        return true;
      }
      
      this.logger.warn(`OrgMemberGuard: Organization ID missing for user ${user.id} (role: ${user.role})`);
      throw new ForbiddenException('Organization ID missing');
    }

    this.logger.debug(`OrgMemberGuard: Checking membership for user ${user.id} in org ${orgId}`);

    try {
    const membership = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id, orgId: String(orgId) },
    });

    if (!membership) {
        // AGENTS: Allow agents to proceed even if not org members (they work with orgs externally)
        if (user.role === 'AGENT') {
          this.logger.debug(`OrgMemberGuard: Agent ${user.id} is not a member of org ${orgId}, but allowing access`);
          req.membership = null; // No membership, but that's OK for agents
          return true;
        }
        
        this.logger.warn(`OrgMemberGuard: User ${user.id} is not a member of org ${orgId}`);
      throw new ForbiddenException('You do not belong to this organization');
    }

    req.membership = membership; // attach membership for controller to use
      this.logger.debug(`OrgMemberGuard: User ${user.id} is a member of org ${orgId} with role ${membership.role}`);
    return true;
    } catch (error: any) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`OrgMemberGuard: Error checking membership: ${error.message}`, error.stack);
      throw new ForbiddenException(`Failed to verify organization membership: ${error.message}`);
    }
  }
}
