const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setNoBackup, writeRules, DATA_EXTRACTION_XML } = require('../with-no-backup');

const manifest = () => ({ manifest: { application: [{ $: { 'android:allowBackup': 'true' } }] } });

describe('plugin with-no-backup (IMP-402)', () => {
  it('TC-SEC-016: allowBackup=false i reguły wykluczeń w <application>', () => {
    expect(setNoBackup(manifest()).manifest.application[0].$).toEqual({
      'android:allowBackup': 'false',
      'android:fullBackupContent': '@xml/polechamp_full_backup_content',
      'android:dataExtractionRules': '@xml/polechamp_data_extraction_rules',
    });
  });

  it('TC-SEC-016: reguły wykluczają bazę i pliki z kopii w chmurze i transferu', () => {
    for (const section of ['cloud-backup', 'device-transfer']) {
      const body = DATA_EXTRACTION_XML.split(`<${section}>`)[1].split(`</${section}>`)[0];
      for (const domain of ['root', 'file', 'database', 'sharedpref']) {
        expect(body).toContain(`<exclude domain="${domain}" path="." />`);
      }
    }
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nobackup-'));
    writeRules(root);
    const dir = path.join(root, 'app/src/main/res/xml');
    expect(fs.readdirSync(dir).sort()).toEqual([
      'polechamp_data_extraction_rules.xml',
      'polechamp_full_backup_content.xml',
    ]);
    fs.rmSync(root, { recursive: true });
  });
});
