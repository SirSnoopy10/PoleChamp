import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { color } from '@polechamp/tokens';

/**
 * Poświata tła ekranu: `radial-gradient(700px 420px at 50% -5%, accent-900, transparent 70%)`
 * z prototypu (RN nie ma gradientów radialnych w stylach – SVG).
 */
export function ScreenGlow({ width = 700, height = 420 }: { width?: number; height?: number }) {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Svg width="100%" height={height} preserveAspectRatio="none">
        <Defs>
          <RadialGradient
            id="glow"
            cx="50%"
            cy={-0.05 * height}
            rx={width / 2}
            ry={height / 2}
            gradientUnits="userSpaceOnUse"
            fx="50%"
            fy={-0.05 * height}
          >
            <Stop offset="0" stopColor={color.accentRamp[900]} stopOpacity={1} />
            <Stop offset="0.7" stopColor={color.accentRamp[900]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy={-0.05 * height} rx={width / 2} ry={height / 2} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', top: 0, left: 0, right: 0 } });
