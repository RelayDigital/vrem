import { Organization, OrganizationMember, OrgRole, OrgType, UserAccountType } from '@prisma/client';

export type EffectiveOrgRole =
  | OrgRole
  | 'PERSONAL_OWNER'
  | 'NONE';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  accountType: UserAccountType;
  personalOrgId?: string | null;
}

export interface OrgContext {
  org: Organization;
  membership: OrganizationMember | null;
  effectiveRole: EffectiveOrgRole;
  isPersonalOrg: boolean;
  isTeamOrg: boolean;
  isCompanyOrg: boolean;
}

type BuildOrgContextArgs = {
  user: AuthenticatedUser;
  org: Organization;
  membership?: OrganizationMember | null;
  memberCount?: number;
};

export function buildOrgContext({
  user,
  org,
  membership,
  memberCount,
}: BuildOrgContextArgs): OrgContext {
  const normalizedType = String(org.type);
  const isPersonalOrg =
    normalizedType === OrgType.PERSONAL || normalizedType === 'PERSONAL';
  const isTeamOrg = normalizedType === 'TEAM';
  const isCompanyOrg =
    normalizedType === OrgType.COMPANY || normalizedType === 'COMPANY';

  let effectiveRole: EffectiveOrgRole = 'NONE';
  const member = membership || null;

  if (isPersonalOrg) {
    const ownsPersonalOrg =
      (!!member && member.userId === user.id) || user.personalOrgId === org.id;
    const isSingleMember =
      typeof memberCount === 'number' ? memberCount <= 1 : false;

    if (ownsPersonalOrg || isSingleMember) {
      effectiveRole = 'PERSONAL_OWNER';
    } else if (member) {
      effectiveRole = member.role;
    }
  } else if (member) {
    effectiveRole = member.role;
  }

  return {
    org,
    membership: member,
    effectiveRole,
    isPersonalOrg,
    isTeamOrg,
    isCompanyOrg,
  };
}
