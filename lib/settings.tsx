// The settings store: named string settings persisted through a key-value
// store the app supplies (AsyncStorage, an encrypted vault, a server...).
// Denim does not decide where settings live; the app's store does.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/** Anything with async string get/set, e.g. AsyncStorage or an app's preference store. */
export interface ISettingsStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * The settings an app keeps, by name: the store key each one is saved under
 * (keep existing keys so saved values survive) and its value before anything
 * is saved.
 */
export type SettingsFields = Record<string, { key: string; default: string }>;

export interface ISettingsContext {
  /** Current values by name (defaults until loaded). */
  values: Record<string, string>;
  /** Every setting has been read (or failed to). */
  ready: boolean;
  /** Names whose saved value could not be read; they keep their default. */
  failed: string[];
  /** Saves one setting; the value changes only once the store accepts it. Throws on failure. */
  save: (name: string, value: string) => Promise<void>;
}

const SettingsContext = createContext<ISettingsContext | null>(null);

const defaults = (fields: SettingsFields) =>
  Object.fromEntries(Object.entries(fields).map(([name, f]) => [name, f.default]));

export function SettingsProvider({ store, fields, children }: {
  store: ISettingsStore;
  fields: SettingsFields;
  children?: React.ReactNode;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => defaults(fields));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  useEffect(() => {
    let active = true;
    const names = Object.keys(fieldsRef.current);
    void Promise.allSettled(names.map(name => store.getItem(fieldsRef.current[name].key))).then(results => {
      if (!active) return;
      const loaded: Record<string, string> = {};
      const missing: string[] = [];
      results.forEach((result, i) => {
        if (result.status === 'rejected') missing.push(names[i]);
        else if (result.value !== null) loaded[names[i]] = result.value;
      });
      setValues(current => ({ ...current, ...loaded }));
      setFailed(missing);
      setReady(true);
    });
    return () => { active = false; };
  }, [store]);
  const save = useCallback(async (name: string, value: string) => {
    const field = fieldsRef.current[name];
    if (!field) throw Error(`Unknown setting "${name}".`);
    await store.setItem(field.key, value);
    setValues(current => ({ ...current, [name]: value }));
  }, [store]);
  return (
    <SettingsContext.Provider value={{ values, ready, failed, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

/** The settings store. Throws outside a <DenimProvider>. */
export function useSettings(): ISettingsContext {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw Error('useSettings() must be used inside <DenimProvider>.');
  return ctx;
}
