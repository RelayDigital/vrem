import { OrganizationMember, User } from '@/types';

export type EffectiveRole = 'COMPANY' | 'TECHNICIAN' | 'AGENT';

const dispatcherLikeRoles = ['OWNER', 'ADMIN', 'COMPANY', 'PROJECT_MANAGER', 'EDITOR'];

export const getEffectiveOrgRole = (
  user: User | null,
  memberships: OrganizationMember[],
  activeOrgId: string | null
): EffectiveRole | null => {
  if (!user) return null;
  const membership = memberships.find((m) => m.orgId === activeOrgId);
  const fallbackAccountType = (user.accountType || '').toUpperCase();
  const fallbackRole = ['COMPANY', 'TECHNICIAN', 'AGENT'].includes(fallbackAccountType)
    ? (fallbackAccountType as EffectiveRole)
    : 'AGENT';

  if (!membership) {
    return fallbackRole;
  }

  const orgType =
    membership.organization?.type || (membership as any)?.organizationType || '';
  const roleUpper = (
    (membership as any).orgRole ||
    (membership as any).role ||
    ''
  ).toUpperCase();

  if (orgType === 'PERSONAL') {
    return 'COMPANY';
  }

  if (dispatcherLikeRoles.includes(roleUpper)) {
    return 'COMPANY';
  }

  if (roleUpper === 'AGENT') {
    return 'AGENT';
  }

  return 'TECHNICIAN';
};

export const isDispatcherRole = (role: EffectiveRole | null) =>
  role === 'COMPANY';
