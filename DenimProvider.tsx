// The headless core of denim-rn, in two providers:
//
// <DenimProvider> (high, above anything that can hold a draft): the skin,
// the settings store, the skin's Theme, and the unsaved-changes guard.
//
// <ApplicationsProvider> (lower, where the app knows which applications are
// on): the application registry, the nav model and the redirect away from
// turned-off applications. It needs the router, so it sits inside
// expo-router (ExpoRoot's `wrapper`, see README).
import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import type { IDenimSkin } from './contract';
import { LeaveGuardProvider, useLeaveForm } from './lib/leaveGuard';
import { SettingsProvider, type ISettingsStore, type SettingsFields } from './lib/settings';
import { appUrl, computeNav, disabledAppRedirect, visibleApplications, type IApplication, type INavState } from './nav';

const SkinContext = createContext<IDenimSkin | null>(null);

export interface DenimProviderProps {
  skin: IDenimSkin;
  /** Where settings persist. Remount the provider (`key`) when the store itself changes. */
  settingsStore: ISettingsStore;
  /** The settings the app and skin keep (see SettingsFields). */
  settingsFields?: SettingsFields;
  /** history.state key for the browser Back/Forward guard. */
  historyKey?: string;
  children?: React.ReactNode;
}

const NO_FIELDS: SettingsFields = {};
const Passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export function DenimProvider({ skin, settingsStore, settingsFields = NO_FIELDS, historyKey, children }: DenimProviderProps) {
  const Theme = skin.Theme ?? Passthrough;
  return (
    <SkinContext.Provider value={skin}>
      <SettingsProvider store={settingsStore} fields={settingsFields}>
        <Theme>
          <LeaveGuardProvider LeaveConfirm={skin.LeaveConfirm} historyKey={historyKey}>
            {children}
          </LeaveGuardProvider>
        </Theme>
      </SettingsProvider>
    </SkinContext.Provider>
  );
}

/** The skin passed to <DenimProvider>. */
export function useSkin(): IDenimSkin {
  const skin = useContext(SkinContext);
  if (!skin) throw Error('useSkin() must be used inside <DenimProvider>.');
  return skin;
}

interface IApplicationsContext {
  applications: IApplication[];
  nav: INavState;
}
const ApplicationsContext = createContext<IApplicationsContext | null>(null);

export function ApplicationsProvider({ applications, children }: {
  /** In nav order. Recompute as the app learns which are on (see IApplication.enabled). */
  applications: IApplication[];
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const leave = useLeaveForm();
  const last = useRef<IApplication | undefined>(undefined);
  const nav = useMemo(() => computeNav(pathname, applications, last.current), [pathname, applications]);
  last.current = nav.currentApp;
  const redirect = disabledAppRedirect(pathname, applications);
  useEffect(() => {
    if (redirect) leave(() => router.navigate(redirect));
  }, [redirect]);
  return (
    <ApplicationsContext.Provider value={{ applications, nav }}>
      {children}
    </ApplicationsContext.Provider>
  );
}

function useApplicationsContext(): IApplicationsContext {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw Error('Needs <ApplicationsProvider> above it.');
  return ctx;
}

/** All registered applications, and the ones to draw (`enabled === true`). */
export function useApplications() {
  const { applications } = useApplicationsContext();
  return useMemo(() => ({ applications, visible: visibleApplications(applications) }), [applications]);
}

/** Where the URL is, plus helpers. */
export function useNav() {
  const { nav } = useApplicationsContext();
  return useMemo(() => ({
    ...nav,
    appUrl,
    /** The application shown as current (the URL's, or the one underneath a covering route). */
    isAppCurrent: (app: IApplication) => nav.currentApp?.path === app.path,
  }), [nav]);
}

/** Opens an application, asking first about unsaved drafts. */
export function useOpenApp() {
  const leave = useLeaveForm();
  return (app: IApplication) => leave(() => router.navigate(appUrl(app)));
}
