// Manifest prywatności iOS `PrivacyInfo.xcprivacy` (IMP-407, NFR-505, R-12): powody użycia API wymagających
// deklaracji, brak śledzenia i domen śledzących, zbierane typy danych zgodne z deklaracją w App Store Connect
// (docs-dev/privacy/store-declarations.md). Expo przy prebuild zapisuje `ios.privacyManifests` do pliku.

const API = (type, reasons) => ({
  NSPrivacyAccessedAPIType: `NSPrivacyAccessedAPICategory${type}`,
  NSPrivacyAccessedAPITypeReasons: reasons,
});

const DATA = (type, linked, purposes) => ({
  NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${type}`,
  NSPrivacyCollectedDataTypeLinked: linked,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: purposes.map((p) => `NSPrivacyCollectedDataTypePurpose${p}`),
});

const PRIVACY_MANIFEST = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyAccessedAPITypes: [
    // MMKV / NSUserDefaults – ustawienia aplikacji.
    API('UserDefaults', ['CA92.1']),
    // Daty plików (SQLite, eksport diagnostyki) – tylko w kontenerze aplikacji.
    API('FileTimestamp', ['C617.1']),
    // Zegar monotoniczny okna logowania offline (TL-21).
    API('SystemBootTime', ['35F9.1']),
    // Kontrola miejsca przed zapisem (TC-EDGE-048).
    API('DiskSpace', ['E174.1']),
  ],
  NSPrivacyCollectedDataTypes: [
    // Konto organizatora.
    DATA('EmailAddress', true, ['AppFunctionality']),
    DATA('Name', true, ['AppFunctionality']),
    // Dane osób w turnieju wprowadzane przez organizatora/sędziego (imiona, nazwiska, oceny).
    DATA('OtherUserContent', true, ['AppFunctionality']),
    // Sentry (region UE) – bez PII, bez śledzenia.
    DATA('CrashData', false, ['AppFunctionality']),
    DATA('PerformanceData', false, ['AppFunctionality']),
  ],
};

const withPrivacyManifest = (config) => {
  config.ios = { ...config.ios, privacyManifests: PRIVACY_MANIFEST };
  return config;
};

module.exports = withPrivacyManifest;
module.exports.PRIVACY_MANIFEST = PRIVACY_MANIFEST;
