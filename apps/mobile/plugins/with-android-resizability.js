// Android 16 ignoruje blokady orientacji i rozmiaru na dużych ekranach; ta właściwość przywraca je
// dla aplikacji, które ich potrzebują (tryb sędziego – ADR-013, IMP-200).
// Android 14+ przy otwartej kamerze obraca ekran aplikacji z blokadą orientacji do naturalnej
// orientacji czujnika (camera compat) – na tablecie: pion na ekranie parowania (podgląd QR).
const { withAndroidManifest } = require('expo/config-plugins');

const PROPERTY = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';
const CAMERA_ROTATION_PROPERTY = 'android.window.PROPERTY_CAMERA_COMPAT_ALLOW_FORCE_ROTATION';

const PROPERTIES = { [PROPERTY]: 'true', [CAMERA_ROTATION_PROPERTY]: 'false' };

/** Dodaje `<property>` do `<application>` (bez duplikatów przy ponownym prebuild). */
function setResizabilityProperty(manifest) {
  const application = manifest.manifest.application?.[0];
  if (!application) throw new Error('Brak <application> w AndroidManifest.xml');
  const properties = (application.property ??= []);
  for (const [name, value] of Object.entries(PROPERTIES)) {
    const existing = properties.find((p) => p.$['android:name'] === name);
    if (existing) existing.$['android:value'] = value;
    else properties.push({ $: { 'android:name': name, 'android:value': value } });
  }
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
module.exports.CAMERA_ROTATION_PROPERTY = CAMERA_ROTATION_PROPERTY;
