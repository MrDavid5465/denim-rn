// Browser Back/Forward guard for the web (react-native-web + expo-router).
// Moved from LT Portfolio's shared/forms/browserHistoryGuard.ts.
//
// popstate cannot be cancelled. Restore the current entry before asking, and
// suppress both events so Expo Router never unmounts the unfinished form.

type Position = { session: string; index: number };
export function guardBrowserHistory(
  win: Window,
  dirty: () => boolean,
  leave: (action: () => void) => void,
  key = 'denimHistory',
) {
  const history = win.history;
  const push = history.pushState, replace = history.replaceState, go = history.go;
  function position(state: any): Position | undefined {
    const value = state?.[key];
    return typeof value?.session === 'string' && Number.isInteger(value.index) ? value : undefined;
  }
  let current = position(history.state) ?? { session: win.crypto.randomUUID(), index: 0 };
  let restoring: { origin: Position; target: Position } | undefined;
  let allowed: number | undefined;
  const stamp = (state: any, index: number) => ({ ...state, [key]: { session: current.session, index } });
  replace.call(history, stamp(history.state, current.index), '');
  const wrappedPush: History['pushState'] = function (state, unused, url) {
    push.call(history, stamp(state, current.index + 1), unused, url);
    current = position(history.state)!;
    allowed = undefined;
  };
  const wrappedReplace: History['replaceState'] = function (state, unused, url) {
    replace.call(history, stamp(state, current.index), unused, url);
  };
  // In-app traversals already pass through useLeaveForm. Expo Router performs
  // them asynchronously, after that guard's synchronous bypass has ended.
  const wrappedGo: History['go'] = function (delta = 0) {
    allowed = delta ? current.index + delta : undefined;
    go.call(history, delta);
  };
  history.pushState = wrappedPush;
  history.replaceState = wrappedReplace;
  history.go = wrappedGo;
  function onPop(event: PopStateEvent) {
    const target = position(event.state);
    if (!target || target.session !== current.session) return;
    if (restoring) {
      event.stopImmediatePropagation();
      const attempt = restoring;
      if (target.index !== attempt.origin.index) {
        go.call(history, attempt.origin.index - target.index);
        return;
      }
      restoring = undefined;
      leave(() => {
        allowed = attempt.target.index;
        go.call(history, attempt.target.index - current.index);
      });
      return;
    }
    if (target.index === allowed || !dirty() || target.index === current.index) {
      allowed = undefined;
      current = target;
      return;
    }
    event.stopImmediatePropagation();
    allowed = undefined;
    restoring = { origin: current, target };
    go.call(history, current.index - target.index);
  }
  win.addEventListener('popstate', onPop, true);
  return () => {
    win.removeEventListener('popstate', onPop, true);
    if (history.pushState === wrappedPush) history.pushState = push;
    if (history.replaceState === wrappedReplace) history.replaceState = replace;
    if (history.go === wrappedGo) history.go = go;
  };
}
