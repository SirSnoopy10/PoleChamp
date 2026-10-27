import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius } from '@polechamp/tokens';
import { Text } from '../../ui/Text';
import { caseTestId, catalogSection, catalogSections } from './registry';
import { useCatalogSettings, type CatalogSettings } from './provider';
export { CatalogSettingsProvider } from './provider';
import './sections';

/* Ekrany narzędziowe zespołu – teksty po polsku bez kluczy i18n (poza src/features). */

const WIDTH = { phone: 390, tablet: 1024 } as const;

function Toggle<K extends keyof CatalogSettings>({
  label,
  field,
  value,
}: {
  label: string;
  field: K;
  value: CatalogSettings[K];
}) {
  const settings = useCatalogSettings();
  const active = settings[field] === value;
  return (
    <Pressable
      // Przepływy wizualne (IMP-504): `catalog-toggle-pseudo`, `catalog-toggle-fontScale-1.3`.
      testID={`catalog-toggle-${field}${typeof value === 'boolean' ? '' : `-${String(value)}`}`}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      onPress={() => settings.update({ [field]: value } as Partial<CatalogSettings>)}
      style={[styles.toggle, active && styles.toggleActive]}
    >
      <Text variant="meta" color={active ? color.accentRamp[200] : color.neutral[300]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Toolbar() {
  const { reducedMotion, pseudo } = useCatalogSettings();
  return (
    <View style={styles.toolbar}>
      <Toggle label="Aa 100%" field="fontScale" value={1} />
      <Toggle label="Aa 130%" field="fontScale" value={1.3} />
      <Toggle label="Telefon" field="width" value="phone" />
      <Toggle label="Tablet" field="width" value="tablet" />
      <Toggle label="Ogranicz ruch" field="reducedMotion" value={!reducedMotion} />
      <Toggle label="Pseudo" field="pseudo" value={!pseudo} />
    </View>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useCatalogSettings();
  return (
    <ScrollView
      style={{ backgroundColor: color.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + 10,
        paddingBottom: insets.bottom + 34,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ width: '100%', maxWidth: WIDTH[width], alignSelf: 'center', gap: 18 }}>{children}</View>
    </ScrollView>
  );
}

export function CatalogIndex() {
  return (
    <Frame>
      <Text variant="titleM">DevCatalog</Text>
      <Toolbar />
      {catalogSections().map((section) => (
        <Link key={section.id} href={`/catalog/${section.id}`} asChild>
          <Pressable testID={`catalog-${section.id}`} style={styles.row}>
            <Text variant="subhead">{section.title}</Text>
            <Text variant="meta" color={color.neutral[400]}>
              {section.cases.length}
            </Text>
          </Pressable>
        </Link>
      ))}
    </Frame>
  );
}

export function CatalogSectionScreen({ id, caseId }: { id: string; caseId?: string }) {
  const section = catalogSection(id);
  if (!section) {
    return (
      <Frame>
        <Text>Brak sekcji „{id}”.</Text>
      </Frame>
    );
  }
  const cases = caseId ? section.cases.filter((c) => c.id === caseId) : section.cases;
  return (
    <Frame>
      <Link href="/catalog" asChild>
        <Pressable accessibilityRole="link">
          <Text variant="subhead" color={color.accent}>
            ‹ DevCatalog
          </Text>
        </Pressable>
      </Link>
      <Text variant="titleM">{section.title}</Text>
      <Toolbar />
      {cases.map((c) => (
        <View key={c.id} testID={caseTestId(section.id, c.id)} style={{ gap: 10 }}>
          <Text variant="kicker" color={color.neutral[400]}>
            {c.title}
          </Text>
          {c.render()}
        </View>
      ))}
    </Frame>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.divider,
  },
  toggleActive: { backgroundColor: color.accentRamp[900], borderColor: color.accent },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    ...{ borderWidth: 1, borderColor: color.neutral[800] },
  },
});
