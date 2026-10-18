// Android's hardware Back. React Native calls the most recently added
// listener first, so a menu that subscribes while open is closed before the
// screen underneath goes back: the innermost thing wins.
import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * While `enabled`, Android's Back calls `handler`. Return `true` when it was
 * handled, `false` to pass Back on to the next listener. Other platforms:
 * nothing.
 */
export function useHardwareBack(handler: () => boolean, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => ref.current());
    return () => subscription.remove();
  }, [enabled]);
}

/** Leaves the app (Android). */
export const exitApp = () => BackHandler.exitApp();
