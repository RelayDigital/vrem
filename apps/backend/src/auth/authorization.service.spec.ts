import { AuthorizationService } from './authorization.service';
import { OrgContext, AuthenticatedUser, buildOrgContext } from './auth-context';
import { OrgType, OrgRole, UserAccountType, Project, Organization } from '@prisma/client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  // Helper to create mock user
  const mockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    accountType: UserAccountType.PROVIDER,
    personalOrgId: 'personal-org-1',
    ...overrides,
  });

  // Helper to create mock organization
  const mockOrg = (overrides: Partial<Organization> = {}): Organization => ({
    id: 'org-1',
    name: 'Test Org',
    type: OrgType.COMPANY,
    createdAt: new Date(),
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    countryCode: null,
    lat: null,
    lng: null,
    legalName: null,
    logoUrl: null,
    phone: null,
    primaryEmail: null,
    serviceArea: null,
    slug: null,
    timezone: null,
    websiteUrl: null,
    ...overrides,
  });

  // Helper to create mock project
  const mockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-1',
    orgId: 'org-1',
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    countryCode: null,
    lat: null,
    lng: null,
    notes: null,
    scheduledTime: new Date(),
    status: 'BOOKED' as any,
    technicianId: null,
    editorId: null,
    projectManagerId: null,
    customerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Delivery fields
    deliveryToken: null,
    deliveryEnabledAt: null,
    // Approval fields
    clientApprovalStatus: 'PENDING_REVIEW' as any,
    clientApprovedAt: null,
    clientApprovedById: null,
    // Payment fields
    stripePaymentIntentId: null,
    paidAt: null,
    paymentAmount: null,
    paymentCurrency: null,
    // Calendar sync fields
    calendarConflict: false,
    calendarConflictNote: null,
    // Demo project field
    isDemo: false,
    ...overrides,
  });

  // Helper to create OrgContext
  const createContext = (
    orgType: OrgType,
    role: OrgRole | null,
    userId: string = 'user-1',
  ): OrgContext => {
    const org = mockOrg({ type: orgType });
    const user = mockUser({ id: userId });
    const membership = role
      ? {
          id: 'member-1',
          userId,
          orgId: org.id,
          role,
          createdAt: new Date(),
        }
      : null;

    return buildOrgContext({
      user,
      org,
      membership,
      memberCount: membership ? 1 : 0,
    });
  };

  beforeEach(() => {
    service = new AuthorizationService();
  });

  describe('PERSONAL org authorization', () => {
    it('PERSONAL_OWNER can manage org settings', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      expect(service.canManageOrgSettings(ctx, user)).toBe(true);
    });

    it('PERSONAL_OWNER can manage team members', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      expect(service.canManageTeamMembers(ctx, user)).toBe(true);
    });

    it('PERSONAL_OWNER can view projects', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      const project = mockProject({ orgId: ctx.org.id });
      expect(service.canViewProject(ctx, project, user)).toBe(true);
    });

    it('PERSONAL_OWNER can manage projects', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const project = mockProject({ orgId: ctx.org.id });
      expect(service.canManageProject(ctx, project)).toBe(true);
    });

    it('PERSONAL_OWNER can upload media', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      const project = mockProject({ orgId: ctx.org.id });
      expect(service.canUploadMedia(ctx, project, user)).toBe(true);
    });

    it('PERSONAL_OWNER can post to team channel', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      const project = mockProject({ orgId: ctx.org.id });
      expect(service.canPostMessage(ctx, project, 'team', user)).toBe(true);
    });

    it('PERSONAL_OWNER can post to customer channel', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      const project = mockProject({ orgId: ctx.org.id });
      expect(service.canPostMessage(ctx, project, 'customer', user)).toBe(true);
    });

    it('Non-owner cannot access PERSONAL org', () => {
      // Note: In practice, OrgContextGuard prevents non-owners from accessing personal orgs
      // before the context is even built. This test verifies the authorization service
      // correctly handles a NONE effectiveRole.
      const org = mockOrg({ id: 'someone-elses-personal-org', type: OrgType.PERSONAL });
      const user = mockUser({ id: 'other-user', personalOrgId: 'my-own-personal-org' });
      const ctx = buildOrgContext({
        user,
        org,
        membership: null,
        memberCount: 2, // Multiple members ensures PERSONAL_OWNER isn't granted as fallback
      });

      // effectiveRole should be NONE since user has no membership and org isn't their personal org
      expect(ctx.effectiveRole).toBe('NONE');

      const project = mockProject({ orgId: ctx.org.id });
      expect(service.canViewProject(ctx, project, user)).toBe(false);
      expect(service.canManageOrgSettings(ctx, user)).toBe(false);
    });
  });

  describe('TEAM/COMPANY org authorization', () => {
    describe('OWNER role', () => {
      it('can manage org settings', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
        const user = mockUser();
        expect(service.canManageOrgSettings(ctx, user)).toBe(true);
      });

      it('can manage team members', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
        const user = mockUser();
        expect(service.canManageTeamMembers(ctx, user)).toBe(true);
      });

      it('can manage projects', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
        const project = mockProject({ orgId: ctx.org.id });
        expect(service.canManageProject(ctx, project)).toBe(true);
      });
    });

    describe('ADMIN role', () => {
      it('can manage org settings', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.ADMIN);
        const user = mockUser();
        expect(service.canManageOrgSettings(ctx, user)).toBe(true);
      });

      it('can manage team members', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.ADMIN);
        const user = mockUser();
        expect(service.canManageTeamMembers(ctx, user)).toBe(true);
      });

      it('can manage projects', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.ADMIN);
        const project = mockProject({ orgId: ctx.org.id });
        expect(service.canManageProject(ctx, project)).toBe(true);
      });
    });

    describe('PROJECT_MANAGER role', () => {
      it('cannot manage org settings', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.PROJECT_MANAGER);
        const user = mockUser();
        expect(service.canManageOrgSettings(ctx, user)).toBe(false);
      });

      it('cannot manage team members', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.PROJECT_MANAGER);
        const user = mockUser();
        expect(service.canManageTeamMembers(ctx, user)).toBe(false);
      });

      it('can manage projects', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.PROJECT_MANAGER);
        const project = mockProject({ orgId: ctx.org.id });
        expect(service.canManageProject(ctx, project)).toBe(true);
      });

      it('can view projects', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.PROJECT_MANAGER);
        const user = mockUser();
        const project = mockProject({ orgId: ctx.org.id });
        expect(service.canViewProject(ctx, project, user)).toBe(true);
      });
    });

    describe('TECHNICIAN role', () => {
      it('cannot manage org settings', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN);
        const user = mockUser();
        expect(service.canManageOrgSettings(ctx, user)).toBe(false);
      });

      it('cannot manage projects', () => {
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN);
        const project = mockProject({ orgId: ctx.org.id });
        expect(service.canManageProject(ctx, project)).toBe(false);
      });

      it('can view assigned projects', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({ orgId: ctx.org.id, technicianId: user.id });
        expect(service.canViewProject(ctx, project, user)).toBe(true);
      });

      it('cannot view unassigned projects', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({ orgId: ctx.org.id, technicianId: 'other-user' });
        expect(service.canViewProject(ctx, project, user)).toBe(false);
      });

      it('can update own work on assigned project', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({
          orgId: ctx.org.id,
          technicianId: user.id,
        });
        expect(service.canUpdateOwnWorkOnProject(ctx, project, user)).toBe(true);
      });

      it('cannot update work on unassigned project', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({
          orgId: ctx.org.id,
          technicianId: 'other-user',
        });
        expect(service.canUpdateOwnWorkOnProject(ctx, project, user)).toBe(false);
      });

      it('can upload media on assigned project', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({
          orgId: ctx.org.id,
          technicianId: user.id,
        });
        expect(service.canUploadMedia(ctx, project, user)).toBe(true);
      });

      it('cannot upload media on unassigned project', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({
          orgId: ctx.org.id,
          technicianId: 'other-user',
        });
        expect(service.canUploadMedia(ctx, project, user)).toBe(false);
      });

      it('can post to team channel', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({ orgId: ctx.org.id });
        expect(service.canPostMessage(ctx, project, 'team', user)).toBe(true);
      });

      it('cannot post to customer channel', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN, user.id);
        const project = mockProject({ orgId: ctx.org.id });
        expect(service.canPostMessage(ctx, project, 'customer', user)).toBe(false);
      });
    });

    describe('EDITOR role', () => {
      it('can view assigned projects', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.EDITOR, user.id);
        const project = mockProject({ orgId: ctx.org.id, editorId: user.id });
        expect(service.canViewProject(ctx, project, user)).toBe(true);
      });

      it('cannot view unassigned projects', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.EDITOR, user.id);
        const project = mockProject({ orgId: ctx.org.id, editorId: 'other-user' });
        expect(service.canViewProject(ctx, project, user)).toBe(false);
      });

      it('can update own work on assigned project', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.EDITOR, user.id);
        const project = mockProject({
          orgId: ctx.org.id,
          editorId: user.id,
        });
        expect(service.canUpdateOwnWorkOnProject(ctx, project, user)).toBe(true);
      });

      it('can upload media on assigned project', () => {
        const user = mockUser();
        const ctx = createContext(OrgType.COMPANY, OrgRole.EDITOR, user.id);
        const project = mockProject({
          orgId: ctx.org.id,
          editorId: user.id,
        });
        expect(service.canUploadMedia(ctx, project, user)).toBe(true);
      });
    });
  });

  describe('Cross-org access prevention', () => {
    it('cannot view project from different org', () => {
      const user = mockUser();
      const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
      const project = mockProject({ orgId: 'different-org' });
      expect(service.canViewProject(ctx, project, user)).toBe(false);
    });

    it('cannot manage project from different org', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
      const project = mockProject({ orgId: 'different-org' });
      expect(service.canManageProject(ctx, project)).toBe(false);
    });

    it('cannot upload media to project from different org', () => {
      const user = mockUser();
      const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
      const project = mockProject({ orgId: 'different-org' });
      expect(service.canUploadMedia(ctx, project, user)).toBe(false);
    });

    it('cannot post message to project from different org', () => {
      const user = mockUser();
      const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
      const project = mockProject({ orgId: 'different-org' });
      expect(service.canPostMessage(ctx, project, 'team', user)).toBe(false);
    });
  });

  describe('canCreateOrganization', () => {
    it('allows creating TEAM org', () => {
      const user = mockUser();
      expect(service.canCreateOrganization(user, OrgType.TEAM)).toBe(true);
    });

    it('allows creating COMPANY org', () => {
      const user = mockUser();
      expect(service.canCreateOrganization(user, OrgType.COMPANY)).toBe(true);
    });

    it('does not allow creating PERSONAL org', () => {
      const user = mockUser();
      expect(service.canCreateOrganization(user, OrgType.PERSONAL)).toBe(false);
    });
  });

  describe('canManageCustomers', () => {
    it('PERSONAL_OWNER can manage customers', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      expect(service.canManageCustomers(ctx, user)).toBe(true);
    });

    it('OWNER can manage customers', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
      const user = mockUser();
      expect(service.canManageCustomers(ctx, user)).toBe(true);
    });

    it('ADMIN can manage customers', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.ADMIN);
      const user = mockUser();
      expect(service.canManageCustomers(ctx, user)).toBe(true);
    });

    it('PROJECT_MANAGER can manage customers', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.PROJECT_MANAGER);
      const user = mockUser();
      expect(service.canManageCustomers(ctx, user)).toBe(true);
    });

    it('TECHNICIAN cannot manage customers', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN);
      const user = mockUser();
      expect(service.canManageCustomers(ctx, user)).toBe(false);
    });
  });

  describe('canViewInquiries', () => {
    it('PERSONAL_OWNER can view inquiries', () => {
      const ctx = createContext(OrgType.PERSONAL, OrgRole.OWNER);
      const user = mockUser();
      expect(service.canViewInquiries(ctx, user)).toBe(true);
    });

    it('OWNER can view inquiries', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.OWNER);
      const user = mockUser();
      expect(service.canViewInquiries(ctx, user)).toBe(true);
    });

    it('ADMIN can view inquiries', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.ADMIN);
      const user = mockUser();
      expect(service.canViewInquiries(ctx, user)).toBe(true);
    });

    it('PROJECT_MANAGER can view inquiries', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.PROJECT_MANAGER);
      const user = mockUser();
      expect(service.canViewInquiries(ctx, user)).toBe(true);
    });

    it('TECHNICIAN cannot view inquiries', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN);
      const user = mockUser();
      expect(service.canViewInquiries(ctx, user)).toBe(false);
    });
  });

  describe('hasOrgRole', () => {
    it('returns true when user has one of the allowed roles', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.ADMIN);
      expect(service.hasOrgRole(ctx, ['OWNER', 'ADMIN'])).toBe(true);
    });

    it('returns false when user does not have any of the allowed roles', () => {
      const ctx = createContext(OrgType.COMPANY, OrgRole.TECHNICIAN);
      expect(service.hasOrgRole(ctx, ['OWNER', 'ADMIN'])).toBe(false);
    });
  });
});

