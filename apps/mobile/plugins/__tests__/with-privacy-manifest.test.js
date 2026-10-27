const fs = require('node:fs');
const path = require('node:path');
const withPrivacyManifest = require('../with-privacy-manifest');

const { PRIVACY_MANIFEST } = withPrivacyManifest;
const ROOT = path.join(__dirname, '../..');

/** SDK analityczne, reklamowe i atrybucji (NFR-505) – nie mogą występować w zależnościach aplikacji. */
const TRACKERS =
  /firebase|analytics|amplitude|mixpanel|segment|appsflyer|adjust|branch|facebook|fbsdk|google-mobile-ads|admob|onesignal|braze|clevertap|posthog|datadog|newrelic|bugsnag|instabug|appcenter|tracking-transparency/i;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'dev' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

describe('IMP-407: prywatność w sklepach (TC-RODO-008)', () => {
  it('TC-RODO-008: manifest iOS bez śledzenia, z powodami API i typami danych', () => {
    const config = withPrivacyManifest({ ios: { bundleIdentifier: 'app.polechamp' } });
    expect(config.ios.bundleIdentifier).toBe('app.polechamp');
    expect(config.ios.privacyManifests.NSPrivacyTracking).toBe(false);
    expect(config.ios.privacyManifests.NSPrivacyTrackingDomains).toEqual([]);
    const reasons = Object.fromEntries(
      PRIVACY_MANIFEST.NSPrivacyAccessedAPITypes.map((a) => [
        a.NSPrivacyAccessedAPIType.replace('NSPrivacyAccessedAPICategory', ''),
        a.NSPrivacyAccessedAPITypeReasons,
      ]),
    );
    expect(reasons).toEqual({
      UserDefaults: ['CA92.1'],
      FileTimestamp: ['C617.1'],
      SystemBootTime: ['35F9.1'],
      DiskSpace: ['E174.1'],
    });
    for (const d of PRIVACY_MANIFEST.NSPrivacyCollectedDataTypes) {
      expect(d.NSPrivacyCollectedDataTypeTracking).toBe(false);
    }
  });

  it('TC-RODO-008: brak SDK analitycznych i reklamowych w zależnościach', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => TRACKERS.test(d))).toEqual([]);
  });

  it('TC-RODO-008: aplikacja łączy się tylko z API, Sentry UE i EAS Update', () => {
    const hosts = new Set();
    for (const file of [...sourceFiles(path.join(ROOT, 'src')), path.join(ROOT, 'app.config.ts')]) {
      for (const [, host] of fs.readFileSync(file, 'utf8').matchAll(/https:\/\/([a-z0-9.-]+)/gi))
        hosts.add(host);
    }
    const allowed =
      /^(api\.polechamp\.app|polechamp\.app|(?:[a-z0-9.-]+\.)?de\.sentry\.io|u\.expo\.dev|apps\.apple\.com|play\.google\.com|localhost)$/;
    expect([...hosts].filter((h) => !allowed.test(h))).toEqual([]);
  });
});
