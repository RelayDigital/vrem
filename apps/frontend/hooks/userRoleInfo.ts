import { AccountType, OrgRole } from '@/types';
import { OrganizationMember } from '@/types';
import { toEffectiveRole } from '@/lib/roles';

export const mapMembershipToEffectiveRole = (
  membership: OrganizationMember | any | undefined,
  fallback: OrgRole | AccountType,
) => {
  if (!membership) return toEffectiveRole(fallback);
  const orgType =
    membership.organization?.type || membership.organizationType || '';
  if (orgType === 'PERSONAL') return 'COMPANY';
  const role =
    (membership.orgRole ||
      membership.role ||
      membership?.organizationRole ||
      fallback) as string;
  return toEffectiveRole(role);
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
  const effectiveRole = toEffectiveRole(role);
  if (effectiveRole === 'COMPANY') return '/dashboard';
  if (effectiveRole === 'AGENT') return '/dashboard';
  if (effectiveRole === 'TECHNICIAN') return '/dashboard';
  return '/';
};
