import { View } from 'react-native';
import { color } from '@polechamp/tokens';
import { Icon, iconMap, type IconName } from '../../../ui/Icon';
import { Text } from '../../../ui/Text';
import { registerSection } from '../registry';

const names = Object.keys(iconMap) as IconName[];

const grid = (weight: 'regular' | 'fill') => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    {names.map((name) => (
      <View key={name} style={{ width: 76, alignItems: 'center', gap: 4 }}>
        <Icon name={name} size={22} weight={weight} color={color.accentRamp[200]} />
        <Text variant="micro" color={color.neutral[400]} numberOfLines={1}>
          {name}
        </Text>
      </View>
    ))}
  </View>
);

registerSection({
  id: 'icons',
  title: 'Ikony',
  cases: [
    { id: 'regular', title: 'Phosphor regular', render: () => grid('regular') },
    { id: 'fill', title: 'Phosphor fill', render: () => grid('fill') },
  ],
});
