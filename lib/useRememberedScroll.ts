// Scroll position per key (a tab, a portfolio), kept while the page is out of
// view or covered. Moved from LT Portfolio's shared/navigation.
import { useLayoutEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ScrollView } from 'react-native';

// Positions live only in this unlocked session. Modal focus restoration can
// reset hidden web scroll views, so ignore those events and restore on close.
export function useRememberedScroll(key: string, blocked = false) {
  const ref = useRef<ScrollView>(null);
  const positions = useRef(new Map<string, number>());
  const restoring = useRef(false);
  const wasBlocked = useRef(false);
  useLayoutEffect(() => {
    restoring.current = true;
    if (blocked) { wasBlocked.current = true; return; }
    const closedOverlay = wasBlocked.current;
    wasBlocked.current = false;
    const y = positions.current.get(key) ?? 0;
    const restore = () => ref.current?.scrollTo({ y, animated: false });
    const frame = requestAnimationFrame(() => { restore(); if (!closedOverlay) restoring.current = false; });
    const timer = closedOverlay ? setTimeout(() => { restore(); restoring.current = false; }, 350) : undefined;
    return () => { cancelAnimationFrame(frame); if (timer) clearTimeout(timer); };
  }, [key, blocked]);
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!blocked && !restoring.current) positions.current.set(key, event.nativeEvent.contentOffset.y);
  }
  return { ref, onScroll, scrollEventThrottle: 100 };
}
