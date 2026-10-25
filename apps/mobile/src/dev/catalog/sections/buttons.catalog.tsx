import { View } from 'react-native';
import { Button, type ButtonSize, type ButtonVariant, type IconRoundSize } from '../../../ui/Button';
import { registerSection } from '../registry';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const;
const VARIANTS: { variant: Exclude<ButtonVariant, 'iconRound'>; label: string }[] = [
  { variant: 'primary', label: 'Utwórz turniej' },
  { variant: 'secondary', label: 'Zakończ turniej' },
  { variant: 'ghost', label: 'Dodaj' },
];
const SIZES: ButtonSize[] = [44, 48, 52];
const ROUND: IconRoundSize[] = [30, 36, 40, 44];

registerSection({
  id: 'buttons',
  title: 'Przyciski',
  cases: [
    ...VARIANTS.map(({ variant, label }) => ({
      id: variant,
      title: `${variant} – rozmiary 44/48/52`,
      render: () => (
        <View style={{ gap: 10 }}>
          {SIZES.map((size) => (
            <Button
              key={size}
              variant={variant}
              size={size}
              label={label}
              icon={variant === 'ghost' ? 'plus' : undefined}
            />
          ))}
        </View>
      ),
    })),
    {
      id: 'states',
      title: 'Stany: disabled, loading, onBar, usuwanie',
      render: () => (
        <View style={{ gap: 10 }}>
          <Button label="Zapisz" disabled />
          <Button label="Zapisz" icon="plus" loading />
          <Button label="Zatwierdź i dalej" onBar fullWidth icon="arrow-right" iconPosition="end" />
          <Button variant="secondary" destructive label="Usuń kryterium" icon="trash" />
        </View>
      ),
    },
    {
      id: 'iconRound',
      title: 'iconRound 30/36/40/44',
      render: () => (
        <View style={row}>
          {ROUND.map((size) => (
            <Button key={size} variant="iconRound" roundSize={size} icon="plus" accessibilityLabel="Dodaj" />
          ))}
          <Button
            variant="iconRound"
            roundSize={36}
            icon="file-pdf"
            accessibilityLabel="Eksport PDF turnieju"
          />
          <Button variant="iconRound" roundSize={30} icon="x" accessibilityLabel="Zamknij" disabled />
        </View>
      ),
    },
  ],
});
