import { describe, expect, it } from 'vitest';
import {
  cloudWatchSearcher,
  injectMark,
  newMark,
  scan,
  sentrySearcher,
  type Fetch,
} from '../src/pii-scan.ts';
import { read } from '../src/docs.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('IMP-403: skan PII w telemetrii (TC-SEC-017)', () => {
  it('TC-SEC-017: znacznik trafia jako nazwa konta, nazwisko, klub, komentarz i e-mail; wymuszony 500', async () => {
    const mark = newMark();
    expect(mark).toMatch(/^PIIMARK-[0-9a-f-]{36}$/);
    const calls: { url: string; body: string }[] = [];
    const http: Fetch = async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body) });
      if (String(url).endsWith('/v1/auth/login')) return json({ accessToken: 't' });
      if (String(url).endsWith('/__e2e/error')) return json({}, 500);
      return json({}, 201);
    };
    const statuses = await injectMark('https://api.staging', mark, http);
    expect(statuses).toContain(500);
    const sent = calls.map((c) => c.body).join('\n');
    for (const field of ['displayName', 'fullName', 'club', 'comment', 'email']) {
      expect(sent).toMatch(new RegExp(`"${field}":"[^"]*${mark}`, 'i'));
    }
    expect(calls.map((c) => new URL(c.url).pathname)).toContain('/__e2e/error');
  });

  it('TC-SEC-017: trafienie w Sentry lub CloudWatch = wyciek, brak trafień = sukces', async () => {
    const mark = 'PIIMARK-x';
    const sentryHttp: Fetch = async (url) => {
      expect(String(url)).toContain('/api/0/projects/pc/mobile/events/?full=true&query=PIIMARK-x');
      return json([{ eventID: 'e1' }]);
    };
    let polls = 0;
    const exec = async (_cmd: string, args: readonly string[]) => {
      if (args[1] === 'start-query') {
        expect(args.join(' ')).toContain('filter @message like /PIIMARK-x/');
        return { stdout: JSON.stringify({ queryId: 'q1' }), stderr: '' };
      }
      polls++;
      return {
        stdout: JSON.stringify({ status: polls > 1 ? 'Complete' : 'Running', results: [] }),
        stderr: '',
      };
    };
    const cw = cloudWatchSearcher(['/ecs/api'], exec as never);
    const sentry = sentrySearcher(
      { baseUrl: 'https://de.sentry.io', org: 'pc', project: 'mobile', token: 't' },
      sentryHttp,
    );
    expect(await scan(mark, 0, [cw])).toEqual([]);
    expect(await scan(mark, 0, [sentry])).toEqual([{ source: 'sentry', count: 1, sample: 'e1' }]);
  });

  it('workflow nocny kończy się błędem przy trafieniu i alarmuje zespół', () => {
    const wf = read('.github/workflows/pii-scan.yml');
    for (const s of ['schedule:', 'pii-scan.ts', 'PII_SCAN_API_URL', 'if: failure()', 'eu-central-1']) {
      expect(wf).toContain(s);
    }
  });
});
