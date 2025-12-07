import { AccountType, OrganizationMember, OrgRole, OrgType, User } from '@/types';

// =============================
// Navigation Item Types
// =============================

export interface NavItem {
  path: string;
  label: string;
  icon: string; // Icon name to be resolved by the component
}

// =============================
// UI Context Types
// =============================

/**
 * UIContext provides all the information needed to render the correct UI
 * based on the user's identity (accountType) and current organization context (orgType).
 */
export interface UIContext {
  /** User's identity - how they signed up (AGENT | PROVIDER | COMPANY) */
  accountType: AccountType;
  /** Current organization type (PERSONAL | TEAM | COMPANY) */
  orgType: OrgType;
  /** User's role within the current organization */
  orgRole: OrgRole | 'PERSONAL_OWNER' | null;
  /** Whether to show the sidebar (true only for elevated roles in COMPANY orgs) */
  showSidebar: boolean;
  /** Whether user has an elevated role (OWNER, ADMIN, PROJECT_MANAGER) in a COMPANY org */
  isElevatedRole: boolean;
  /** Navigation items for the header (when sidebar is not shown) */
  navItems: NavItem[];
  /** Whether user can create orders/jobs */
  canCreateOrder: boolean;
  /** Label for the create action ("Create Order" for agents, "New Job" for providers/company) */
  createActionLabel: string;
  /** Path for the create action */
  createActionPath: string;
  /** Whether user can manage customers at CRM level (create/edit/delete) - OWNER/ADMIN only */
  canManageCustomers: boolean;
}

// =============================
// Navigation Configurations
// =============================

/** Navigation items for AGENT in PERSONAL or TEAM org */
const AGENT_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/calendar', label: 'Calendar', icon: 'Calendar' },
];

/** Navigation items for PROVIDER in PERSONAL org */
const PROVIDER_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/jobs/all-jobs', label: 'Jobs', icon: 'Briefcase' },
  { path: '/calendar', label: 'Calendar', icon: 'Calendar' },
];

// =============================
// Legacy Types (for backward compatibility)
// =============================

export type EffectiveRole = 'COMPANY' | 'TECHNICIAN' | 'AGENT';

export const companyOrgRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'] as const;

// =============================
// Helper Functions
// =============================

/**
 * Converts a raw role string to an EffectiveRole for backward compatibility.
 * @deprecated Use getUIContext instead
 */
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

/**
 * Gets the effective org role for backward compatibility.
 * @deprecated Use getUIContext instead
 */
export const getEffectiveOrgRole = (
  user: User | null,
  memberships: OrganizationMember[],
  activeOrgId: string | null
): EffectiveRole | null => {
  if (!user) return null;
  
  const ctx = getUIContext(user, memberships, activeOrgId);
  if (!ctx) return null;
  
  // Map UIContext to legacy EffectiveRole
  if (ctx.showSidebar) {
    return 'COMPANY';
  }
  if (ctx.accountType === 'AGENT') {
    return 'AGENT';
  }
  return 'TECHNICIAN';
};

export const isCompanyRole = (role: EffectiveRole | null) =>
  role === 'COMPANY';

// =============================
// Main UIContext Function
// =============================

/**
 * Builds the UIContext based on user identity and current organization.
 * This is the primary function for determining UI layout and navigation.
 */
export function getUIContext(
  user: User | null,
  memberships: OrganizationMember[],
  activeOrgId: string | null
): UIContext | null {
  if (!user) return null;

  const membership = memberships.find((m) => m.orgId === activeOrgId);
  
  // Determine organization type
  const orgType: OrgType = 
    membership?.organization?.type || 
    (membership as any)?.organizationType || 
    'PERSONAL';
  
  // Determine organization role
  const orgRole: OrgRole | 'PERSONAL_OWNER' | null = 
    orgType === 'PERSONAL' 
      ? 'PERSONAL_OWNER' 
      : ((membership as any)?.orgRole || membership?.role || null);
  
  // User's identity (accountType) - trust the normalized value from auth-context
  // Default to PROVIDER if somehow missing (should not happen with proper auth)
  const accountType: AccountType = user.accountType || 'PROVIDER';
  
  // Determine if user has elevated role in COMPANY org
  const roleUpper = (orgRole || '').toString().toUpperCase();
  const elevatedRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
  const isElevatedRole = orgType === 'COMPANY' && elevatedRoles.includes(roleUpper);
  
  // Sidebar is only shown for elevated roles in COMPANY orgs
  // Non-elevated roles (TECHNICIAN, EDITOR) see header-only navigation like PERSONAL orgs
  const showSidebar = isElevatedRole;
  
  // Determine navigation items based on context
  let navItems: NavItem[] = [];
  let canCreateOrder = false;
  let createActionLabel = 'New Job';
  let createActionPath = '';
  
  // Customer management is restricted to OWNER/ADMIN only
  // PROJECT_MANAGER cannot manage customers at CRM level
  const adminRoles = ['OWNER', 'ADMIN', 'PERSONAL_OWNER'];
  const canManageCustomers = adminRoles.includes(roleUpper) || orgType === 'PERSONAL';
  
  if (!showSidebar) {
    // Header-only navigation (PERSONAL org, or non-elevated in COMPANY org)
    if (accountType === 'AGENT') {
      // AGENT in PERSONAL or TEAM org
      navItems = AGENT_NAV_ITEMS;
      canCreateOrder = true;
      createActionLabel = 'Create Order';
      createActionPath = '/booking'; // Use original AgentBookingFlow
    } else if (accountType === 'PROVIDER' || accountType === 'COMPANY') {
      // PROVIDER in PERSONAL org or TECHNICIAN/EDITOR in COMPANY org
      navItems = PROVIDER_NAV_ITEMS;
      // Providers don't create jobs - they receive them
      canCreateOrder = false;
    }
  } else {
    // COMPANY org with elevated role - sidebar handles navigation
    // canCreateOrder depends on role within company
    canCreateOrder = ['OWNER', 'ADMIN'].includes(roleUpper);
    createActionLabel = 'New Job';
    createActionPath = ''; // Empty - use dialog instead of navigation
  }
  
  return {
    accountType,
    orgType,
    orgRole,
    showSidebar,
    isElevatedRole,
    navItems,
    canCreateOrder,
    createActionLabel,
    createActionPath,
    canManageCustomers,
  };
}

/**
 * Hook-friendly version that returns a default context when user is null.
 */
export function getUIContextOrDefault(
  user: User | null,
  memberships: OrganizationMember[],
  activeOrgId: string | null
): UIContext {
  const ctx = getUIContext(user, memberships, activeOrgId);
  if (ctx) return ctx;
  
  // Return a safe default for loading/unauthenticated states
  return {
    accountType: 'PROVIDER',
    orgType: 'PERSONAL',
    orgRole: null,
    showSidebar: false,
    isElevatedRole: false,
    navItems: PROVIDER_NAV_ITEMS,
    canCreateOrder: false,
    createActionLabel: 'New Job',
    createActionPath: '',
    canManageCustomers: false,
  };
}
