import { OrganizationMember, User } from '@/types';

export type EffectiveRole = 'COMPANY' | 'TECHNICIAN' | 'AGENT';

export const companyOrgRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'] as const;

export const toEffectiveRole = (rawRole?: string | null): EffectiveRole => {
  const roleUpper = (rawRole || '').toUpperCase();
  if (roleUpper === 'COMPANY' || companyOrgRoles.includes(roleUpper as any)) {
    return 'COMPANY';
  }
  if (roleUpper === 'TECHNICIAN' || roleUpper === 'PROVIDER') {
    return 'TECHNICIAN';
  }
  if (roleUpper === 'AGENT') {
    return 'AGENT';
  }
  return 'AGENT';
};

export const getEffectiveOrgRole = (
  user: User | null,
  memberships: OrganizationMember[],
  activeOrgId: string | null
): EffectiveRole | null => {
  if (!user) return null;
  const membership = memberships.find((m) => m.orgId === activeOrgId);
  const fallbackRole = toEffectiveRole(user.accountType);

  if (!membership) {
    return fallbackRole;
  }

  const orgType =
    membership.organization?.type || (membership as any)?.organizationType || '';
  const rawRole =
    (membership as any).orgRole ||
    (membership as any).role ||
    user.accountType;

  if (orgType === 'PERSONAL') {
    return 'COMPANY';
  }

  return toEffectiveRole(rawRole || fallbackRole);
};

export const isCompanyRole = (role: EffectiveRole | null) =>
  role === 'COMPANY';
