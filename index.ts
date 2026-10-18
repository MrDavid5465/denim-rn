// denim-rn: the headless core of the Denim app shell for React Native and
// expo-router. No UI imports; a skin (the app's own, or a package) draws it.
// See README.

// Providers and the skin contract
export { DenimProvider, ApplicationsProvider, useSkin, useApplications, useNav, useOpenApp } from './DenimProvider';
export type { DenimProviderProps } from './DenimProvider';
export type { IDenimSkin } from './contract';

// Layout
export { DenimTabs } from './DenimTabs';

// Nav model (pure)
export {
  appForPath, appUrl, computeNav, disabledAppRedirect, firstSegment, tabScreenNames, visibleApplications,
} from './nav';
export type { IApplication, INavState } from './nav';

// Settings
export { useSettings } from './lib/settings';
export type { ISettingsStore, ISettingsContext, SettingsFields } from './lib/settings';

// Unsaved changes, Back
export { useLeaveForm, useDraftChanges, useDirtyChanges } from './lib/leaveGuard';
export type { ILeaveConfirmProps } from './lib/leaveGuard';
export { guardBrowserHistory } from './lib/browserHistoryGuard';
export { useHardwareBack, exitApp } from './lib/hardwareBack';
export { useRememberedScroll } from './lib/useRememberedScroll';
