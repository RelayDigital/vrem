import { AccountType, OrgRole } from '@/types';
import { OrganizationMember } from '@/types';

export const mapMembershipToEffectiveRole = (
  membership: OrganizationMember | any | undefined,
  fallback: OrgRole | AccountType,
): OrgRole | AccountType => {
  if (!membership) return fallback;
  const orgType =
    membership.organization?.type || membership.organizationType || '';
  if (orgType === 'PERSONAL') return fallback || 'PROVIDER';
  const role = (membership.role || '').toUpperCase();
  if (['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'].includes(role)) {
    return 'COMPANY';
  }
  return 'PROVIDER';
};

export const getActiveOrgRoleFromMemberships = (
  memberships: OrganizationMember[],
  activeOrganizationId: string | null,
): OrgRole | null => {
  const activeMembership = memberships.find(
    (m) => m.orgId === activeOrganizationId,
  );

  const rawRole =
    (activeMembership as any)?.orgRole ??
    (activeMembership as any)?.role ??
    null;

  return rawRole ? (rawRole.toUpperCase() as OrgRole) : null;
};

export const getUserDashboardPath = (role: OrgRole | AccountType): string => {
  if (role === 'COMPANY') return '/dashboard';
  if (role === 'AGENT') return '/dashboard';
  if (role === 'PROVIDER') return '/dashboard';
  return '/';
};
