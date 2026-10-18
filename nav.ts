// The nav model: which application the URL is on. Pure functions of
// (pathname, applications), so a skin, a test or a server can use them
// without React. `useNav()` (hooks.ts) is the React wrapper.
//
// Adapted from denim's nav.ts for expo-router, where routes are files:
// - one application may sit at the root (`path: ""`, the `index` route);
// - an application can own extra top-level routes (`under`), e.g. a report
//   at `/report` that belongs to the Portfolio tab;
// - applications can be turned off (`enabled`), and their URLs then redirect.

export interface IApplication {
  /** Stable name, also the default label. */
  name: string;
  /** The first URL segment; "" for the application at `/`. */
  path: string;
  /** Shorter text for the nav, when `name` is too long. */
  label?: string;
  /** Whatever the skin draws for it (a glyph, an icon name). */
  icon?: string;
  /**
   * Other first segments that belong to this application, e.g. ["report"]:
   * the nav keeps it active there, and its layout registers their routes.
   */
  under?: string[];
  /**
   * `true` shows it. `false` hides it and redirects its URLs to the first
   * enabled application. `undefined` means "not known yet" (still loading):
   * hidden, but its URLs are left alone.
   */
  enabled?: boolean;
}

const trimSlashes = (p: string) => p.replace(/\/+$/, '') || '/';

/** `/<app.path>`, or `/` for the root application. */
export const appUrl = (app: IApplication): string => `/${app.path}`;

/** The first path segment, "" at the root. */
export const firstSegment = (pathname: string): string =>
  pathname.split('/').filter(Boolean)[0] ?? '';

/**
 * The application whose path or `under` list holds the URL's first segment
 * (whole-segment match: "watch" is not "watchlist"). The root application
 * owns `/` only, not every page.
 */
export function appForPath(pathname: string, applications: IApplication[]): IApplication | undefined {
  const segment = firstSegment(pathname);
  return applications.find(a => a.path === segment || (a.under ?? []).includes(segment));
}

export interface INavState {
  /** The current location's pathname. */
  pathname: string;
  /** The application the URL is in, if any (none on covering routes such as `/settings`). */
  activeApp?: IApplication;
  /**
   * The application to show as current: `activeApp`, or on a covering route
   * (a pushed screen, a settings page) the last application visited, so the
   * tab underneath stays lit.
   */
  currentApp?: IApplication;
}

/** `previous` is the last `currentApp`, kept by the caller across calls. */
export function computeNav(
  pathname: string,
  applications: IApplication[],
  previous?: IApplication,
): INavState {
  const path = trimSlashes(pathname);
  const activeApp = appForPath(path, applications);
  const fallback = previous && applications.find(a => a.path === previous.path);
  return { pathname: path, activeApp, currentApp: activeApp ?? fallback ?? applications[0] };
}

/** Applications to draw in the nav: those with `enabled === true`. */
export const visibleApplications = (applications: IApplication[]): IApplication[] =>
  applications.filter(a => a.enabled === true);

/** Where to send a URL of a turned-off application, or undefined to stay. */
export function disabledAppRedirect(pathname: string, applications: IApplication[]): string | undefined {
  const app = appForPath(pathname, applications);
  if (!app || app.enabled !== false) return undefined;
  const home = applications.find(a => a.enabled !== false);
  return home ? appUrl(home) : '/';
}

/** expo-router screen names for the tabs layout: each app's route plus its `under` routes. */
export function tabScreenNames(applications: IApplication[]): string[] {
  return applications.flatMap(a => [a.path || 'index', ...(a.under ?? [])]);
}
