import { View } from 'react-native';
import { Avatar } from '../../../ui/Avatar';
import { Badge } from '../../../ui/Badge';
import { ProgressBar } from '../../../ui/ProgressBar';
import { StatusPill, type PillVariant } from '../../../ui/StatusPill';
import { registerSection } from '../registry';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const;
const STATUS: PillVariant[] = ['draft', 'live', 'done', 'unplayed', 'provisional'];
const SYNC: PillVariant[] = ['synced', 'sending', 'offlineQueue', 'offline', 'attention'];

registerSection({
  id: 'status',
  title: 'Statusy, odznaki, awatary, postęp',
  cases: [
    {
      id: 'pills',
      title: 'StatusPill',
      render: () => (
        <View style={row}>
          {STATUS.map((v) => (
            <StatusPill key={v} variant={v} />
          ))}
        </View>
      ),
    },
    {
      id: 'sync',
      title: 'StatusPill – synchronizacja',
      render: () => (
        <View style={row}>
          {SYNC.map((v) => (
            <StatusPill key={v} variant={v} count={3} />
          ))}
        </View>
      ),
    },
    {
      id: 'narrow',
      title: 'Wąski kontener – bez zawijania',
      render: () => (
        <View style={{ width: 90 }}>
          <StatusPill variant="draft" />
        </View>
      ),
    },
    {
      id: 'badges',
      title: 'Badge',
      render: () => (
        <View style={row}>
          <Badge variant="weight" value={15} />
          <Badge variant="weight" value={20} compact />
          <Badge variant="penalty" value={20} />
          <Badge variant="penalty" value={5} compact />
          <Badge variant="number" value={47} />
          <Badge variant="number" value={47} size={56} />
          <Badge variant="number" value={12} tone="neutral" />
          <Badge variant="scored" />
        </View>
      ),
    },
    {
      id: 'avatars',
      title: 'Avatar 28/38/44/64',
      render: () => (
        <View style={row}>
          <Avatar name="Katarzyna Nowak" size={28} />
          <Avatar name="Katarzyna Nowak" />
          <Avatar name="Anna Maria Kowalska-Nowak" size={44} />
          <Avatar name="Ola" size={64} />
          <Avatar name="Piotr Wiśniewski" state="inactive" />
          <Avatar name="Ewa Zielińska" state="locked" />
        </View>
      ),
    },
    {
      id: 'progress',
      title: 'ProgressBar 3/4/6',
      render: () => (
        <View style={{ gap: 12 }}>
          <ProgressBar value={0.3} height={3} />
          <ProgressBar value={0.67} label="30/45 ocen" />
          <ProgressBar value={0.8} height={6} />
          <ProgressBar value={0.5} tone="secondary" />
        </View>
      ),
    },
  ],
});
