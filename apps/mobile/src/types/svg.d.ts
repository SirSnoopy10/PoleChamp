// phosphor-react-native (importy pojedynczych ikon ze `src/`) przekazuje `className` do <Svg>
// na potrzeby web; typy react-native-svg tego propu nie deklarują.
import 'react-native-svg';

declare module 'react-native-svg' {
  interface SvgProps {
    className?: string;
  }
}
