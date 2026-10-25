import { renderWithProviders, screen } from '../../test-utils/render';
import { Icon, iconMap, type IconName } from '../Icon';

/** Lista z 09-design-system §3 (battery-* rozwinięte do używanych stopni). */
const DESIGN_SYSTEM_ICONS = [
  'trophy',
  'caret-left',
  'caret-right',
  'x',
  'plus',
  'minus',
  'pencil-simple',
  'trash',
  'file-pdf',
  'download-simple',
  'play',
  'flag-checkered',
  'lock-simple',
  'lock-simple-open',
  'arrow-right',
  'sign-out',
  'backspace',
  'calendar-blank',
  'map-pin',
  'info',
  'archive',
  'squares-four',
  'hand-pointing',
  'gavel',
  'device-mobile',
  'device-tablet',
  'check-circle',
  'circle',
  'circle-dashed',
  'warning-circle',
  'cloud-check',
  'cloud-slash',
  'arrows-clockwise',
  'clock',
  'qr-code',
  'key',
  'user-circle',
  'user-minus',
  'copy',
  'eye',
  'eye-slash',
  'magnifying-glass',
  'battery-full',
  'battery-high',
  'battery-medium',
  'battery-low',
  'battery-empty',
  'battery-charging',
  'battery-warning',
  'link-break',
  'x-circle',
  'device-rotate',
] as const satisfies readonly IconName[];

describe('Icon (IMP-210)', () => {
  it('każda ikona z design systemu ma odpowiednik i nic ponad listę', () => {
    expect(Object.keys(iconMap).sort()).toEqual([...DESIGN_SYSTEM_ICONS].sort());
  });

  it('ikony dekoracyjne są ukryte przed czytnikiem, informacyjne mają etykietę', async () => {
    await renderWithProviders(
      <>
        <Icon name="trophy" />
        <Icon name="cloud-slash" accessibilityLabel="Offline" />
      </>,
    );
    expect(screen.queryByTestId('icon-trophy')).toBeNull();
    expect(screen.getByRole('image', { name: 'Offline' })).toBeOnTheScreen();
  });

  it('nazwa spoza listy nie przechodzi kontroli typów', () => {
    // @ts-expect-error – „heart” nie należy do zatwierdzonych ikon (09-design-system §3).
    const name: IconName = 'heart';
    expect(iconMap[name]).toBeUndefined();
  });
});
