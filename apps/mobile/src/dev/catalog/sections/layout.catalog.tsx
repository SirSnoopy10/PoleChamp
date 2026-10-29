import { useState } from 'react';
import { View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { CategoryActionBar } from '../../../features/org/CategoryActionBar';
import { Button } from '../../../ui/Button';
import { ScreenHeader } from '../../../ui/layout/ScreenHeader';
import { StickyActionBar } from '../../../ui/layout/StickyActionBar';
import { SegmentedControl } from '../../../ui/SegmentedControl';
import { registerSection } from '../registry';

const frame = {
  height: 220,
  borderRadius: radius.lg,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: color.divider,
  backgroundColor: color.surface,
} as const;

function Tabs() {
  const [tab, setTab] = useState<'criteria' | 'athletes' | 'results'>('criteria');
  return (
    <SegmentedControl
      value={tab}
      onChange={setTab}
      segments={[
        { key: 'criteria', label: 'Kryteria', count: 5 },
        { key: 'athletes', label: 'Zawodniczki', count: 12 },
        { key: 'results', label: 'Wyniki' },
      ]}
    />
  );
}

registerSection({
  id: 'layout',
  title: 'Rama ekranu',
  cases: [
    {
      id: 'header',
      title: 'ScreenHeader / BackLink',
      render: () => (
        <ScreenHeader
          back={{ label: 'Turniej', onPress: () => undefined }}
          actions={
            <Button
              variant="iconRound"
              roundSize={36}
              icon="pencil-simple"
              accessibilityLabel="Edytuj kategorię"
            />
          }
        />
      ),
    },
    { id: 'segmented', title: 'SegmentedControl', render: () => <Tabs /> },
    {
      id: 'sticky',
      title: 'StickyActionBar',
      render: () => (
        <View style={frame}>
          <StickyActionBar>
            <Button variant="secondary" fullWidth label="Zakończ kategorię" />
            <Button onBar fullWidth icon="file-pdf" label="Eksport PDF" />
          </StickyActionBar>
        </View>
      ),
    },
    {
      id: 'category-bar',
      title: 'Pasek kategorii – W przygotowaniu',
      render: () => (
        <View style={frame}>
          <CategoryActionBar category="DRAFT" tournament="IN_PROGRESS" onAction={() => undefined} />
        </View>
      ),
    },
  ],
});
