import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';
import { FILTERED, scrubPii } from '@polechamp/contracts';
import { diagLog } from '../data/sync/diagLog';

/** Okruszki z dowolnym tekstem (toasty, konsola, dotyk) mogą zawierać nazwiska – bez treści. */
const FREE_TEXT_CATEGORIES = /^(console|ui\.|touch|sentry\.event)/;

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const scrubbed = scrubPii(breadcrumb);
  if (scrubbed.category && FREE_TEXT_CATEGORIES.test(scrubbed.category) && scrubbed.message) {
    scrubbed.message = FILTERED;
  }
  return scrubbed;
}

/** `beforeSend`: bez PII w treści, kontekstach, okruszkach i adresach URL (TC-SEC-017). */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed = scrubPii(withSyncDiag(event));
  scrubbed.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb);
  if (scrubbed.user) scrubbed.user = { id: scrubbed.user.id };
  return scrubbed;
}

/** Ostatnie 100 wpisów dziennika synchronizacji tabletu w `extra.syncDiag` (IMP-359 krok 4). */
export function withSyncDiag(event: ErrorEvent): ErrorEvent {
  const tail = diagLog.tail(100);
  return tail.length ? { ...event, extra: { ...event.extra, syncDiag: tail } } : event;
}
