// Dispatcher-specific settings sub-view components
// Import and export your settings components here
// Example:
// import PersonalDetails from './PersonalDetails';
// import Business from './Business';
// 
// export const dispatcherSettingsComponents = {
//   'personal-details': PersonalDetails,
//   'business': Business,
//   // ... add more as needed
// } as const;

import type { SettingsSubViewComponents } from '@/components/shared/settings';

// Export an empty registry by default - components will be added as they're created
export const dispatcherSettingsComponents: SettingsSubViewComponents = {};

