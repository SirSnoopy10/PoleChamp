// Baza tabletu (SQLite), MMKV i pliki aplikacji nie trafiają do kopii zapasowych ani do transferu
// między urządzeniami (IMP-402, 05-bezpieczenstwo §5.5, MASVS-STORAGE-2).
const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const RULES = 'polechamp_data_extraction_rules';
const BACKUP_RULES = 'polechamp_full_backup_content';

/** Android 12+ (`dataExtractionRules`): wykluczone wszystkie domeny – kopia w chmurze i transfer. */
const DATA_EXTRACTION_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="root" path="." />
    <exclude domain="file" path="." />
    <exclude domain="database" path="." />
    <exclude domain="sharedpref" path="." />
    <exclude domain="external" path="." />
  </cloud-backup>
  <device-transfer>
    <exclude domain="root" path="." />
    <exclude domain="file" path="." />
    <exclude domain="database" path="." />
    <exclude domain="sharedpref" path="." />
    <exclude domain="external" path="." />
  </device-transfer>
</data-extraction-rules>
`;

/** Android ≤ 11 (`fullBackupContent`) – te same wykluczenia. */
const FULL_BACKUP_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="root" path="." />
  <exclude domain="file" path="." />
  <exclude domain="database" path="." />
  <exclude domain="sharedpref" path="." />
  <exclude domain="external" path="." />
</full-backup-content>
`;

/** Atrybuty `<application>`: brak kopii (`allowBackup=false`) i reguły wykluczeń. */
function setNoBackup(manifest) {
  const application = manifest.manifest.application?.[0];
  if (!application) throw new Error('Brak <application> w AndroidManifest.xml');
  application.$ = {
    ...application.$,
    'android:allowBackup': 'false',
    'android:fullBackupContent': `@xml/${BACKUP_RULES}`,
    'android:dataExtractionRules': `@xml/${RULES}`,
  };
  return manifest;
}

/** Zapis plików reguł do `res/xml` projektu Androida. */
function writeRules(androidRoot) {
  const dir = path.join(androidRoot, 'app/src/main/res/xml');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${RULES}.xml`), DATA_EXTRACTION_XML);
  fs.writeFileSync(path.join(dir, `${BACKUP_RULES}.xml`), FULL_BACKUP_XML);
}

const withNoBackup = (config) => {
  config = withAndroidManifest(config, (c) => {
    c.modResults = setNoBackup(c.modResults);
    return c;
  });
  return withDangerousMod(config, [
    'android',
    (c) => {
      writeRules(c.modRequest.platformProjectRoot);
      return c;
    },
  ]);
};

module.exports = withNoBackup;
module.exports.setNoBackup = setNoBackup;
module.exports.writeRules = writeRules;
module.exports.DATA_EXTRACTION_XML = DATA_EXTRACTION_XML;
