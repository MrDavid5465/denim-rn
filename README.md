# denim-rn

The headless core of the Denim app shell for **React Native and
expo-router**. It is the React Native counterpart of
[denim](https://github.com/MrDavid5465/denim), the same way
[denim-wc](https://github.com/MrDavid5465/denim-wc) is its web-components
counterpart: the same pattern, its own code. Denim decides **what** the
frame of an app knows; a skin decides **how it looks**:

- an **application registry**: the app's top-level sections (tabs), each
  with a name, a path, an optional label and icon, extra routes that belong
  to it (`under`), and whether it is turned on (`enabled`);
- a **nav model**: which application the URL is in, and which one to show
  as current under a covering route (a pushed screen, a settings page);
- **turned-off applications**: hidden from the nav, and their URLs
  redirect home once the app knows they are off;
- a **settings store**: named settings persisted through a key-value store
  the app supplies (AsyncStorage, an encrypted vault, a server);
- the **unsaved-changes guard**: forms register drafts, and every move that
  would leave them asks first, including the browser's Back/Forward and
  closing the page on the web;
- **Android Back**: innermost first (an open menu closes before the screen
  goes back);
- **scroll memory** per page;
- a **tabs layout** for expo-router's JS tabs, drawn by the skin.

It has no data layer and no backend contract: where data comes from is the
app's business. It renders no visible UI of its own.

Consumed as source (no build step, no npm package), for example as a git
submodule at `src/lib/denim-rn`.

## Setup

Two providers. `DenimProvider` goes high, above anything that can hold a
draft; `ApplicationsProvider` goes wherever the app knows which
applications are on. Both must be inside expo-router: mount them through
`ExpoRoot`'s `wrapper`, so that restoring an older browser history entry
(which can recreate the root layout) doesn't throw away the app's state.

```tsx
// RouterApp.tsx, registered by index.js
export function RouterApp() {
  return <ExpoRoot context={ctx} wrapper={AppProviders} />;
}

function AppProviders({ children }: { children?: React.ReactNode }) {
  return (
    <DenimProvider skin={mySkin} settingsStore={AsyncStorage} settingsFields={mySettings}>
      <MyData>
        <ApplicationsProvider applications={useMyApplications()}>{children}</ApplicationsProvider>
      </MyData>
    </DenimProvider>
  );
}
```

Remount `DenimProvider` (a `key`) when the settings store itself changes,
for example when the app switches from device to server storage.

### Applications

```ts
const applications: IApplication[] = [
  { name: 'Portfolio', path: '', under: ['report'], icon: '◫', enabled: true },
  { name: 'Activity', path: 'activity', icon: '≡', enabled: true },
  { name: 'Watchlist', path: 'watchlist', icon: '☆', enabled: watchlistOn },
];
```

- `path: ''` is the application at `/` (the `index` route). It owns `/`
  only, not every page.
- `under` lists other first URL segments that belong to the application:
  the nav keeps it current there, and the tabs layout registers their
  routes.
- `enabled`: `true` draws it; `false` hides it and redirects its URLs to the
  first application that isn't off; `undefined` means "not known yet" (still
  loading): hidden, URLs left alone.

### Routes

Routes are files. The tabs group's layout is one line:

```tsx
// src/app/(tabs)/_layout.tsx
export { DenimTabs as default } from '../../lib/denim-rn';
```

with one route file per application path and `under` entry
(`(tabs)/index.tsx`, `(tabs)/report.tsx`, `(tabs)/activity.tsx`, ...).
Screens that cover the tabs (a detail screen, settings) live in the root
stack, which the app writes itself.

## Hooks

| Hook | Gives |
|---|---|
| `useApplications()` | `{ applications, visible }` (`visible`: `enabled === true`) |
| `useNav()` | `pathname`, `activeApp` (the URL's), `currentApp` (the URL's, or the one underneath), `isAppCurrent(app)`, `appUrl(app)` |
| `useOpenApp()` | `open(app)`: navigate, asking first about drafts |
| `useSettings()` | `{ values, ready, failed, save(name, value) }` |
| `useLeaveForm()` | `leave(action)`: run now, or after "discard?" |
| `useDraftChanges(value, enabled, onDiscard)` | tracks a form's value against its value when editing began; `{ markSaved, leave }` |
| `useDirtyChanges(dirty, onDiscard)` | registers a draft by your own flag; returns `leave` |
| `useHardwareBack(handler, enabled)` | Android Back while `enabled`; return `true` when handled |
| `useRememberedScroll(key, blocked)` | props for a ScrollView that keep its position per key |
| `useSkin()` | the skin object |

The nav model is also available as pure functions (`computeNav`,
`appForPath`, `disabledAppRedirect`, `tabScreenNames`,
`visibleApplications`) for tests or non-React code.

## Writing a skin

A skin is one object passed to `<DenimProvider skin={...}>`:

| Member | Draws |
|---|---|
| `Theme` (optional) | wraps everything under the settings store; reads `useSettings()` and provides the skin's colours and type |
| `Frame` | around the tabs: safe area, header, banners; renders `children` (the tabs) |
| `TabBar` | the tabs' bar, from `useApplications().visible`, `useNav()` and `useOpenApp()` |
| `LeaveConfirm` | the "discard unsaved changes?" question: `onKeep`, `onDiscard` |
| `useSceneStyle` (optional) | a hook returning each tab scene's style (its background) |

Everything else (layout, icons, motion, extra chrome) is the skin's choice.
A skin can live in the app (LT Portfolio keeps its own in `src/skin/`) or
be a package of its own.

## Settings

```ts
const mySettings: SettingsFields = {
  appearance: { key: 'my-appearance-v1', default: 'system' },
  largeText: { key: 'my-large-text-v1', default: 'false' },
};
```

Values are strings, stored under `key` (keep existing keys when adopting
denim-rn, so saved values survive). `save` changes the value only once the
store accepts it, and throws otherwise. `failed` lists settings whose saved
value couldn't be read; they keep their default.

## Tests

```sh
npm test    # node --experimental-strip-types --test test/
```
