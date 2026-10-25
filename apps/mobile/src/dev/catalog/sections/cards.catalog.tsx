import { View } from 'react-native';
import { color } from '@polechamp/tokens';
import { Badge } from '../../../ui/Badge';
import { CategoryCard } from '../../../ui/cards/CategoryCard';
import { ProgressCard, StatTiles } from '../../../ui/cards/StatTiles';
import { TournamentCard } from '../../../ui/cards/TournamentCard';
import { EmptyState } from '../../../ui/EmptyState';
import { Icon } from '../../../ui/Icon';
import { GroupedList, ListRow, RowTile } from '../../../ui/list/GroupedList';
import { SectionHeader } from '../../../ui/SectionHeader';
import { SkeletonCard, SkeletonRow } from '../../../ui/Skeleton';
import { registerSection } from '../registry';

const noop = () => undefined;

registerSection({
  id: 'cards',
  title: 'Karty i listy',
  cases: [
    {
      id: 'tournament',
      title: 'TournamentCard',
      render: () => (
        <TournamentCard
          name="Mistrzostwa Polski Pole Sport 2026"
          status="live"
          date="3–4 października 2026"
          place="Warszawa, Hala Torwar"
          categories={6}
          pct={80}
          onPress={noop}
        />
      ),
    },
    {
      id: 'category',
      title: 'CategoryCard',
      render: () => (
        <View style={{ gap: 10 }}>
          <CategoryCard
            name="Pole Sport Seniorki Elite – bardzo długa nazwa kategorii"
            style="Pole Sport"
            level="Elite"
            athletes={12}
            status="live"
            done={30}
            expected={45}
            onPress={noop}
          />
          <CategoryCard
            name="Exotic Juniorki"
            style="Exotic"
            level="Amator"
            athletes={1}
            status="draft"
            done={0}
            expected={0}
          />
        </View>
      ),
    },
    {
      id: 'stats',
      title: 'StatTiles i ProgressCard',
      render: () => (
        <View style={{ gap: 10 }}>
          <StatTiles
            tiles={[
              { label: 'Kategorie', value: 6 },
              { label: 'Zawodniczki', value: 48 },
              { label: 'Sędziowie', value: 5, onPress: noop },
            ]}
          />
          <ProgressCard pct={67} summary="30 z 45 ocen w rozpoczętych kategoriach" />
        </View>
      ),
    },
    {
      id: 'list',
      title: 'SectionHeader + GroupedList',
      render: () => (
        <View>
          <SectionHeader title="Kryteria oceny" onAdd={noop} />
          <GroupedList>
            <ListRow
              title="Technika"
              subtitle="Skala 0–10"
              trailing={<Badge variant="weight" value={20} />}
              onPress={noop}
            />
            <ListRow
              title="Artyzm"
              subtitle="Skala 0–10"
              trailing={<Badge variant="weight" value={15} />}
              onPress={noop}
            />
            <ListRow
              title="Mistrzostwa Polski 2025"
              subtitle="12–13 września 2025 · Kraków"
              leading={
                <RowTile>
                  <Icon name="archive" color={color.neutral[500]} />
                </RowTile>
              }
              minHeight={60}
            />
          </GroupedList>
        </View>
      ),
    },
    {
      id: 'empty',
      title: 'EmptyState',
      render: () => (
        <View style={{ gap: 10 }}>
          <EmptyState
            variant="framed"
            icon="squares-four"
            text="Brak kategorii. Dodaj pierwszą, aby zacząć."
            onPress={noop}
          />
          <EmptyState variant="inline" text="Brak zawodniczek." />
          <EmptyState variant="circle" icon="check-circle" text="Wszystkie występy ocenione." />
          <EmptyState variant="error" onRetry={noop} />
        </View>
      ),
    },
    {
      id: 'skeleton',
      title: 'Skeleton',
      render: () => (
        <View style={{ gap: 10 }}>
          <SkeletonCard />
          <GroupedList>
            <SkeletonRow />
            <SkeletonRow />
          </GroupedList>
        </View>
      ),
    },
  ],
});
