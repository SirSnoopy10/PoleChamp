import { useEffect, useRef, useState } from 'react';
import type { Db } from '../local/LocalDb';
import { syncEvents, type SyncEvent } from '../sync/events';
import { judgeRuntime } from './runtime';

/**
 * Odczyt z lokalnej bazy z odświeżeniem po zdarzeniach synchronizacji (`syncEvents` – emitowane po
 * `COMMIT` zmian z serwera i lokalnych zatwierdzeń). Odczyty są synchroniczne – ekran nie czeka.
 * `deps` – wartości, od których zależy zapytanie (jak w `useMemo`).
 */
export function useLocalQuery<T>(
  read: (db: Db) => T,
  deps: readonly unknown[],
  filter: (e: SyncEvent) => boolean = () => true,
): T {
  const readRef = useRef(read);
  readRef.current = read;
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const [value, setValue] = useState(() => read(judgeRuntime().local.read));
  const first = useRef(true);
  useEffect(() => {
    const db = judgeRuntime().local.read;
    if (!first.current) setValue(readRef.current(db));
    first.current = false;
    return syncEvents.subscribe((e) => {
      if (filterRef.current(e)) setValue(readRef.current(db));
    });
  }, deps);
  return value;
}
