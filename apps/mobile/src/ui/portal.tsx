import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

type Entries = { key: string; node: ReactNode }[];

interface PortalApi {
  mount: (key: string, node: ReactNode) => void;
  unmount: (key: string) => void;
}

const PortalContext = createContext<PortalApi | null>(null);

/**
 * Warstwa nad ekranami dla arkuszy i dialogów (IMP-206). Własny portal zamiast `Modal`, żeby gesty
 * (Gesture Handler) i toasty działały w tym samym drzewie, a kolejność warstw = kolejność otwarcia.
 */
export function PortalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entries>([]);
  const api = useMemo<PortalApi>(
    () => ({
      mount: (key, node) =>
        setEntries((list) => {
          const i = list.findIndex((e) => e.key === key);
          if (i < 0) return [...list, { key, node }];
          const next = list.slice();
          next[i] = { key, node };
          return next;
        }),
      unmount: (key) => setEntries((list) => list.filter((e) => e.key !== key)),
    }),
    [],
  );
  return (
    <PortalContext.Provider value={api}>
      {children}
      {entries.length ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {entries.map((e) => (
            <Fragment key={e.key}>{e.node}</Fragment>
          ))}
        </View>
      ) : null}
    </PortalContext.Provider>
  );
}

/** Renderuje dzieci w warstwie portalu (bez providera – w miejscu, np. w testach komponentów). */
export function Portal({ children }: { children: ReactNode }) {
  const api = useContext(PortalContext);
  const key = useId();
  useEffect(() => {
    if (!api) return;
    api.mount(key, children);
  }, [api, key, children]);
  useEffect(() => () => api?.unmount(key), [api, key]);
  return api ? null : <>{children}</>;
}
