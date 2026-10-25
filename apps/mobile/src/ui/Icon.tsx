import type { ComponentType } from 'react';
import { View } from 'react-native';
import type { IconProps as PhosphorProps } from 'phosphor-react-native';
import { ArchiveIcon } from 'phosphor-react-native/src/icons/Archive';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { BackspaceIcon } from 'phosphor-react-native/src/icons/Backspace';
import { BatteryChargingIcon } from 'phosphor-react-native/src/icons/BatteryCharging';
import { BatteryEmptyIcon } from 'phosphor-react-native/src/icons/BatteryEmpty';
import { BatteryFullIcon } from 'phosphor-react-native/src/icons/BatteryFull';
import { BatteryHighIcon } from 'phosphor-react-native/src/icons/BatteryHigh';
import { BatteryLowIcon } from 'phosphor-react-native/src/icons/BatteryLow';
import { BatteryMediumIcon } from 'phosphor-react-native/src/icons/BatteryMedium';
import { BatteryWarningIcon } from 'phosphor-react-native/src/icons/BatteryWarning';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { CircleIcon } from 'phosphor-react-native/src/icons/Circle';
import { CircleDashedIcon } from 'phosphor-react-native/src/icons/CircleDashed';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CloudCheckIcon } from 'phosphor-react-native/src/icons/CloudCheck';
import { CloudSlashIcon } from 'phosphor-react-native/src/icons/CloudSlash';
import { CopyIcon } from 'phosphor-react-native/src/icons/Copy';
import { DeviceMobileIcon } from 'phosphor-react-native/src/icons/DeviceMobile';
import { DeviceRotateIcon } from 'phosphor-react-native/src/icons/DeviceRotate';
import { DeviceTabletIcon } from 'phosphor-react-native/src/icons/DeviceTablet';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { FilePdfIcon } from 'phosphor-react-native/src/icons/FilePdf';
import { FlagCheckeredIcon } from 'phosphor-react-native/src/icons/FlagCheckered';
import { GavelIcon } from 'phosphor-react-native/src/icons/Gavel';
import { HandPointingIcon } from 'phosphor-react-native/src/icons/HandPointing';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { LinkBreakIcon } from 'phosphor-react-native/src/icons/LinkBreak';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { LockSimpleOpenIcon } from 'phosphor-react-native/src/icons/LockSimpleOpen';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { QrCodeIcon } from 'phosphor-react-native/src/icons/QrCode';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SquaresFourIcon } from 'phosphor-react-native/src/icons/SquaresFour';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { TrophyIcon } from 'phosphor-react-native/src/icons/Trophy';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import { UserMinusIcon } from 'phosphor-react-native/src/icons/UserMinus';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';
import { useTheme } from './theme/ThemeProvider';

/**
 * Zatwierdzone ikony Phosphor (09-design-system §3, IMP-210). Importy pojedynczych plików –
 * bundel zawiera tylko te ikony. Nazwa spoza listy nie przejdzie kontroli typów.
 */
export const iconMap = {
  trophy: TrophyIcon,
  'caret-left': CaretLeftIcon,
  'caret-right': CaretRightIcon,
  x: XIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  'pencil-simple': PencilSimpleIcon,
  trash: TrashIcon,
  'file-pdf': FilePdfIcon,
  'download-simple': DownloadSimpleIcon,
  play: PlayIcon,
  'flag-checkered': FlagCheckeredIcon,
  'lock-simple': LockSimpleIcon,
  'lock-simple-open': LockSimpleOpenIcon,
  'arrow-right': ArrowRightIcon,
  'sign-out': SignOutIcon,
  backspace: BackspaceIcon,
  'calendar-blank': CalendarBlankIcon,
  'map-pin': MapPinIcon,
  info: InfoIcon,
  archive: ArchiveIcon,
  'squares-four': SquaresFourIcon,
  'hand-pointing': HandPointingIcon,
  gavel: GavelIcon,
  'device-mobile': DeviceMobileIcon,
  'device-tablet': DeviceTabletIcon,
  'check-circle': CheckCircleIcon,
  circle: CircleIcon,
  'circle-dashed': CircleDashedIcon,
  'warning-circle': WarningCircleIcon,
  'cloud-check': CloudCheckIcon,
  'cloud-slash': CloudSlashIcon,
  'arrows-clockwise': ArrowsClockwiseIcon,
  clock: ClockIcon,
  'qr-code': QrCodeIcon,
  key: KeyIcon,
  'user-circle': UserCircleIcon,
  'user-minus': UserMinusIcon,
  copy: CopyIcon,
  eye: EyeIcon,
  'eye-slash': EyeSlashIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'battery-full': BatteryFullIcon,
  'battery-high': BatteryHighIcon,
  'battery-medium': BatteryMediumIcon,
  'battery-low': BatteryLowIcon,
  'battery-empty': BatteryEmptyIcon,
  'battery-charging': BatteryChargingIcon,
  'battery-warning': BatteryWarningIcon,
  'link-break': LinkBreakIcon,
  'x-circle': XCircleIcon,
  'device-rotate': DeviceRotateIcon,
} as const satisfies Record<string, ComponentType<PhosphorProps>>;

export type IconName = keyof typeof iconMap;

export interface IconProps {
  name: IconName;
  /** 12–28 dp (09-design-system §3). */
  size?: number;
  color?: string;
  weight?: 'regular' | 'fill';
  /** Ikony są domyślnie dekoracyjne; etykieta tylko dla samodzielnych ikon informacyjnych. */
  accessibilityLabel?: string;
  testID?: string;
}

export function Icon({ name, size = 18, color, weight = 'regular', accessibilityLabel, testID }: IconProps) {
  const theme = useTheme();
  const Component = iconMap[name];
  const decorative = !accessibilityLabel;
  return (
    <View
      testID={testID ?? `icon-${name}`}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      <Component size={size} color={color ?? theme.roles.textPrimary} weight={weight} />
    </View>
  );
}
