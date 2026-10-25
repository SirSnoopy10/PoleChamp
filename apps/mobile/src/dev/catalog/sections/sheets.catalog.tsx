import { View } from 'react-native';
import { Button } from '../../../ui/Button';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useSheet, useSheetStep } from '../../../ui/sheet';
import { Text } from '../../../ui/Text';
import { registerSection } from '../registry';

function BasicSheet() {
  const sheet = useSheet();
  return (
    <>
      <Button label="Otwórz arkusz" onPress={sheet.open} testID="open-basic" />
      <Sheet {...sheet.props} accessibilityLabel="Nowa kategoria">
        <SheetHeader title="Nowa kategoria" />
        <Text variant="bodyS">Treść arkusza dopasowuje wysokość. Zamknij tłem, gestem, „×” albo wstecz.</Text>
        <Button label="Zapisz" fullWidth onPress={sheet.close} />
      </Sheet>
    </>
  );
}

function ConfirmExample() {
  const sheet = useSheet();
  return (
    <>
      <Button variant="secondary" label="Zakończ turniej" onPress={sheet.open} />
      <Sheet {...sheet.props}>
        <ConfirmContent
          icon="flag-checkered"
          title="Zakończyć turniej?"
          text="Wyniki zostaną zablokowane. Tej operacji nie można cofnąć."
          actions={
            <>
              <Button label="Zakończ turniej" fullWidth onPress={sheet.close} />
              <Button variant="secondary" label="Anuluj" fullWidth onPress={sheet.close} />
            </>
          }
        />
      </Sheet>
    </>
  );
}

function SecondStepExample() {
  const sheet = useSheet();
  const { step, setStep, reset } = useSheetStep<'form' | 'confirm'>('form');
  const close = () => {
    sheet.close();
    reset();
  };
  return (
    <>
      <Button variant="secondary" label="Edytuj kryterium" onPress={sheet.open} />
      <Sheet visible={sheet.visible} onClose={close}>
        <SheetStep stepKey={step}>
          {step === 'form' ? (
            <View style={{ gap: 14 }}>
              <SheetHeader title="Technika" />
              <Button label="Zapisz" fullWidth onPress={close} />
              <Button
                variant="secondary"
                destructive
                label="Usuń kryterium"
                fullWidth
                onPress={() => setStep('confirm')}
              />
            </View>
          ) : (
            <ConfirmContent
              icon="trash"
              title="Usunąć kryterium?"
              text="„Technika” zniknie z formularza sędziów."
              actions={
                <>
                  <Button label="Usuń" fullWidth onPress={close} />
                  <Button variant="secondary" label="Anuluj" fullWidth onPress={() => setStep('form')} />
                </>
              }
            />
          )}
        </SheetStep>
      </Sheet>
    </>
  );
}

registerSection({
  id: 'sheets',
  title: 'Arkusze',
  cases: [
    { id: 'basic', title: 'Sheet + SheetHeader', render: () => <BasicSheet /> },
    { id: 'confirm', title: 'Potwierdzenie', render: () => <ConfirmExample /> },
    { id: 'second-step', title: 'Drugi krok (180 ms)', render: () => <SecondStepExample /> },
  ],
});
