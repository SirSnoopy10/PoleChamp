import { useState } from 'react';
import { View } from 'react-native';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Dialog } from '../../../ui/Dialog';
import { toast } from '../../../ui/Toast';
import { registerSection } from '../registry';

function DialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" label="Wyloguj (tablet)" onPress={() => setOpen(true)} />
      <Dialog
        visible={open}
        onClose={() => setOpen(false)}
        title="Wylogować się?"
        text="Masz 2 niewysłane oceny. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią."
        actions={
          <>
            <Button variant="secondary" size={44} label="Anuluj" onPress={() => setOpen(false)} />
            <Button size={44} label="Wyloguj" onPress={() => setOpen(false)} />
          </>
        }
      />
    </>
  );
}

registerSection({
  id: 'feedback',
  title: 'Toast, Banner, Dialog',
  cases: [
    {
      id: 'toast',
      title: 'Toast (2,2 s, zastępowanie)',
      render: () => (
        <View style={{ gap: 10 }}>
          <Button label="Toast sukcesu" onPress={() => toast.success('toasts:changesSaved')} />
          <Button variant="secondary" label="Toast błędu" onPress={() => toast.error('toasts:saveFailed')} />
          <Button variant="ghost" label="Toast info" onPress={() => toast.info('toasts:startListUpdated')} />
        </View>
      ),
    },
    {
      id: 'banners',
      title: 'Banner',
      render: () => (
        <View style={{ gap: 10 }}>
          <Banner variant="locked" />
          <Banner
            variant="rejected"
            text="2 oceny nie zostały przyjęte – kategoria zablokowana"
            onPress={() => undefined}
          />
          <Banner variant="offline" />
          <Banner variant="emailVerify" onAction={() => undefined} />
        </View>
      ),
    },
    { id: 'dialog', title: 'Dialog (tablet)', render: () => <DialogExample /> },
  ],
});
