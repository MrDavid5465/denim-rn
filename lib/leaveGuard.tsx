// The unsaved-changes guard: forms register drafts; every move that would
// leave them (a tab press, Back, the browser's Back/Forward, closing the
// page) asks first. Headless: the skin's LeaveConfirm draws the question.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { guardBrowserHistory } from './browserHistoryGuard';

/** What a skin's LeaveConfirm receives while a move waits for an answer. */
export interface ILeaveConfirmProps {
  /** Stay, keeping the drafts. */
  onKeep: () => void;
  /** Discard every draft, then make the move. */
  onDiscard: () => void;
}

type Guard = {
  register: (id: object, dirty: boolean, discard?: () => void) => void;
  remove: (id: object) => void;
  leave: (action: () => void) => void;
};
const LeaveContext = createContext<Guard | null>(null);

export interface ILeaveGuardProps {
  LeaveConfirm: React.ComponentType<ILeaveConfirmProps>;
  /** The key the browser-history guard stamps into history.state. */
  historyKey?: string;
  children?: React.ReactNode;
}

export function LeaveGuardProvider({ LeaveConfirm, historyKey, children }: ILeaveGuardProps) {
  const drafts = useRef(new Map<object, (() => void) | undefined>()), bypass = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!drafts.current.size) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const guard = useMemo<Guard>(() => ({
    register(id, dirty, discard) { if (dirty) drafts.current.set(id, discard); else drafts.current.delete(id); },
    remove(id) { drafts.current.delete(id); if (!drafts.current.size) setPending(null); },
    leave(action) { if (!bypass.current && drafts.current.size) setPending(() => action); else action(); },
  }), []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    return guardBrowserHistory(window, () => drafts.current.size > 0, guard.leave, historyKey);
  }, [guard, historyKey]);
  const discard = () => {
    const action = pending;
    setPending(null);
    bypass.current = true;
    try {
      for (const drop of [...drafts.current.values()]) drop?.();
      action?.();
    } finally {
      bypass.current = false;
    }
  };
  return (
    <LeaveContext.Provider value={guard}>
      {children}
      {pending && <LeaveConfirm onKeep={() => setPending(null)} onDiscard={discard} />}
    </LeaveContext.Provider>
  );
}

function useGuard(): Guard {
  const guard = useContext(LeaveContext);
  if (!guard) throw Error('Unsaved changes provider missing.');
  return guard;
}

/** Runs `action` now, or after the user agrees to discard unsaved drafts. */
export function useLeaveForm() {
  return useGuard().leave;
}

/**
 * Tracks a form's value against the value it had when `enabled` turned on;
 * a difference is an unsaved draft. `onDiscard` gets that saved value back.
 */
export function useDraftChanges<T>(value: T, enabled = true, onDiscard?: (saved: T) => void) {
  const guard = useGuard();
  const id = useRef({}), snapshot = JSON.stringify(value);
  const previous = useRef(false), baseline = useRef(snapshot);
  const savedValue = useRef(value), discardRef = useRef(onDiscard);
  discardRef.current = onDiscard;
  const [, render] = useState(0);
  if (enabled && !previous.current) { baseline.current = snapshot; savedValue.current = value; }
  previous.current = enabled;
  useEffect(() => {
    guard.register(id.current, enabled && snapshot !== baseline.current, () => discardRef.current?.(savedValue.current));
  }, [guard, enabled, snapshot, baseline.current]);
  useEffect(() => () => guard.remove(id.current), [guard]);
  return {
    markSaved(next: T = value) {
      baseline.current = JSON.stringify(next);
      savedValue.current = next;
      guard.register(id.current, false);
      render(n => n + 1);
    },
    leave: guard.leave,
  };
}

/** Registers a draft by a dirty flag of your own. Returns `leave`. */
export function useDirtyChanges(dirty: boolean, onDiscard?: () => void) {
  const guard = useGuard();
  const id = useRef({});
  const discardRef = useRef(onDiscard);
  discardRef.current = onDiscard;
  useEffect(() => { guard.register(id.current, dirty, () => discardRef.current?.()); }, [guard, dirty]);
  useEffect(() => () => guard.remove(id.current), [guard]);
  return guard.leave;
}
