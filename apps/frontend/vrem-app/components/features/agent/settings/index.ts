// Agent-specific settings sub-view components
// Import and export your settings components here
// Example:
// import PersonalDetails from './PersonalDetails';
// import Billing from './Billing';
// 
// export const agentSettingsComponents = {
//   'personal-details': PersonalDetails,
//   'billing': Billing,
//   // ... add more as needed
// } as const;

import type { SettingsSubViewComponents } from '@/components/shared/settings';

// Export an empty registry by default - components will be added as they're created
export const agentSettingsComponents: SettingsSubViewComponents = {};

