// Odczyty organizatora (IMP-461): lista, szczegóły turnieju, wyniki kategorii, eksport PDF.
import { check, sleep } from 'k6';
import { get, post } from './lib.js';

export function organizer(data) {
  const t = data[Math.floor(Math.random() * data.length)];
  const tags = { kind: 'read' };
  check(get('/v1/tournaments?status=active', t.org, tags), { 'lista 200': (r) => r.status === 200 });
  check(get(`/v1/tournaments/${t.tournamentId}`, t.org, tags), { 'turniej 200': (r) => r.status === 200 });
  const c = t.categories[Math.floor(Math.random() * t.categories.length)];
  check(get(`/v1/categories/${c.id}/results`, t.org, tags), { 'wyniki 200': (r) => r.status === 200 });
  if (Math.random() < 0.02) {
    check(
      post('/v1/exports', { scope: 'CATEGORY', tournamentId: t.tournamentId, categoryId: c.id }, t.org, {
        kind: 'write',
      }),
      {
        'eksport 202': (r) => r.status === 202,
      },
    );
  }
  sleep(2 + Math.random() * 3);
}
