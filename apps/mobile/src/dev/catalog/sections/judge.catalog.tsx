import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { JudgeHeaderView } from '../../../features/judge/JudgeHeader';
import { LogoutDialog } from '../../../features/judge/LogoutDialog';
import { createScoreFormStore } from '../../../features/scoring/formStore';
import { ScoreFooter } from '../../../features/scoring/ScoreFooter';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { PinDots } from '../../../ui/pin/PinDots';
import { PinPad } from '../../../ui/pin/PinPad';
import { CriterionCard } from '../../../ui/scoring/CriterionCard';
import { PenaltyCounter } from '../../../ui/scoring/PenaltyCounter';
import { StatusPill, type SyncVariant } from '../../../ui/StatusPill';
import { registerSection } from '../registry';

const SYNC: SyncVariant[] = ['synced', 'sending', 'offlineQueue', 'offline', 'attention'];
const column = { gap: 12 } as const;
const grid = { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } as const;
const noop = () => undefined;

const CONFIG = {
  criteria: [
    { id: 'k1', scaleMax: 10, weightTenths: 20 },
    { id: 'k2', scaleMax: 10, weightTenths: 15 },
    { id: 'k3', scaleMax: 10, weightTenths: 10 },
  ],
  penaltyTypes: [{ id: 'p1', pointsTenths: 20, maxOccurrences: 3 }],
};

function Footer({ penalties, label }: { penalties: number; label: string }) {
  const store = useMemo(
    () =>
      createScoreFormStore({
        criteria: { k1: 85, k2: 85, k3: 80 },
        penalties: { p1: penalties },
        comment: '',
      }),
    [penalties],
  );
  return <ScoreFooter store={store} config={CONFIG} maxHundredths={4500} label={label} onSubmit={noop} />;
}

function Criterion({
  name,
  description,
  disabled,
}: {
  name: string;
  description?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(85);
  return (
    <View style={{ width: 360 }}>
      <CriterionCard
        id="k1"
        name={name}
        description={description}
        weightTenths={20}
        scaleMax={10}
        value={value}
        onChange={(_, v) => setValue(v)}
        disabled={disabled}
      />
    </View>
  );
}

function Logout() {
  const [count, setCount] = useState(0);
  return (
    <>
      <Button variant="secondary" label="Pokaż dialog (2 oceny)" onPress={() => setCount(2)} />
      <LogoutDialog count={count} onCancel={() => setCount(0)} onConfirm={() => setCount(0)} />
    </>
  );
}

// Ekrany sędziego (EP-08): elementy bez lokalnej bazy – pełne ekrany w trybie sędziego na tablecie.
registerSection({
  id: 'judge',
  title: 'Panel sędziego (tablet)',
  cases: [
    {
      id: 'header-states',
      title: 'JudgeHeader – 5 stanów pigułki',
      render: () => (
        <View style={column}>
          {SYNC.map((v) => (
            <JudgeHeaderView
              key={v}
              tournamentName="Mistrzostwa Polski Pole Sport 2026"
              judge={{ fullName: 'Katarzyna Nowak', initials: 'KN' }}
              pill={
                <View>
                  <StatusPill variant={v} count={3} />
                </View>
              }
              onLogout={noop}
            />
          ))}
        </View>
      ),
    },
    {
      id: 'header-long',
      title: 'JudgeHeader – długa nazwa turnieju',
      render: () => (
        <JudgeHeaderView
          tournamentName="Otwarte Międzynarodowe Mistrzostwa Polski Pole Sport, Pole Art i Exotic 2026 – Gorzów"
          judge={{ fullName: 'Aleksandra Kot-Brzęczyszczykiewicz', initials: 'AKB' }}
          pill={
            <View>
              <StatusPill variant="offlineQueue" count={12} />
            </View>
          }
          onLogout={noop}
        />
      ),
    },
    {
      id: 'pin',
      title: 'PinDots / PinPad – 2 cyfry, pulsowanie, blokada',
      render: () => (
        <View style={grid}>
          <View style={column}>
            <PinDots filled={2} />
            <PinPad onDigit={noop} onBackspace={noop} />
          </View>
          <View style={column}>
            <PinDots filled={4} pulsing />
            <PinPad onDigit={noop} onBackspace={noop} disabled />
          </View>
        </View>
      ),
    },
    {
      id: 'criteria',
      title: 'CriterionCard – zwykła, długa nazwa z opisem, podgląd',
      render: () => (
        <View style={grid}>
          <Criterion name="Technika" />
          <Criterion
            name="Wrażenie artystyczne i interpretacja muzyki"
            description="Spójność choreografii z muzyką, ekspresja, wykorzystanie przestrzeni sceny i rur."
          />
          <Criterion name="Artyzm" disabled />
        </View>
      ),
    },
    {
      id: 'penalties',
      title: 'PenaltyCounter – 0 / 1 / maksimum',
      render: () => (
        <View style={grid}>
          {[0, 1, 3].map((count) => (
            <View key={count} style={{ width: 360 }}>
              <PenaltyCounter
                id={`p${count}`}
                name="Upadek"
                pointsTenths={20}
                maxOccurrences={3}
                count={count}
                onChange={noop}
              />
            </View>
          ))}
        </View>
      ),
    },
    {
      id: 'footer',
      title: 'Stopka – bez kar / z karami / aktualizacja',
      render: () => (
        <View style={column}>
          <Footer penalties={0} label="Zatwierdź i dalej" />
          <Footer penalties={2} label="Zatwierdź ocenę" />
          <Footer penalties={0} label="Zaktualizuj ocenę" />
        </View>
      ),
    },
    {
      id: 'banners',
      title: 'Banery formularza i kolejki',
      render: () => (
        <View style={column}>
          <Banner variant="locked" />
          <Banner
            variant="rejected"
            text="3 oceny nie zostały przyjęte – kategoria zablokowana"
            onPress={noop}
          />
          <Banner variant="rejected" text="Ta ocena nie została przyjęta: Zawodniczka wycofana." />
          <Banner variant="rejected" text="Ocena zmieniona na innym urządzeniu." />
          <Banner variant="emailVerify" text="Lista startowa została zaktualizowana" />
        </View>
      ),
    },
    { id: 'logout', title: 'SCR-JDG-09 – dialog wylogowania', render: () => <Logout /> },
  ],
});
