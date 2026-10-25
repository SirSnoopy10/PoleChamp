const { setResizabilityProperty, PROPERTY } = require('../with-android-resizability');

const manifest = () => ({ manifest: { application: [{ $: {} }] } });

describe('plugin with-android-resizability (IMP-200, ADR-013)', () => {
  it('TC-COMPAT-005: dodaje PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY do <application>', () => {
    const result = setResizabilityProperty(manifest());
    expect(result.manifest.application[0].property).toEqual([
      { $: { 'android:name': PROPERTY, 'android:value': 'true' } },
    ]);
  });

  it('nie duplikuje właściwości przy ponownym prebuild', () => {
    const once = setResizabilityProperty(manifest());
    expect(setResizabilityProperty(once).manifest.application[0].property).toHaveLength(1);
  });
});
