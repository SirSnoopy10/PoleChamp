// Android 16 ignoruje blokady orientacji i rozmiaru na dużych ekranach; ta właściwość przywraca je
// dla aplikacji, które ich potrzebują (tryb sędziego – ADR-013, IMP-200).
const { withAndroidManifest } = require('expo/config-plugins');

const PROPERTY = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';

/** Dodaje `<property>` do `<application>` (bez duplikatów przy ponownym prebuild). */
function setResizabilityProperty(manifest) {
  const application = manifest.manifest.application?.[0];
  if (!application) throw new Error('Brak <application> w AndroidManifest.xml');
  const properties = (application.property ??= []);
  const existing = properties.find((p) => p.$['android:name'] === PROPERTY);
  if (existing) existing.$['android:value'] = 'true';
  else properties.push({ $: { 'android:name': PROPERTY, 'android:value': 'true' } });
  return manifest;
}

const withAndroidResizability = (config) =>
  withAndroidManifest(config, (c) => {
    c.modResults = setResizabilityProperty(c.modResults);
    return c;
  });

module.exports = withAndroidResizability;
module.exports.setResizabilityProperty = setResizabilityProperty;
module.exports.PROPERTY = PROPERTY;
