import { useMemo } from 'react';
import {
  AlphaType,
  Canvas,
  ColorType,
  FilterMode,
  Image,
  MipmapMode,
  Skia,
} from '@shopify/react-native-skia';
import type { PixelCanvasProps } from './PixelCanvas.types';

/**
 * Bufor 80×70 skalowany całkowitą wielokrotnością bez wygładzania (pixel-art) – Skia na iOS
 * i Androidzie (decyzja IMP-211 / 09-design-system §4.21).
 */
export function PixelCanvas({
  pixels,
  version,
  gridWidth,
  gridHeight,
  width,
  height,
  testID,
}: PixelCanvasProps) {
  const image = useMemo(() => {
    const data = Skia.Data.fromBytes(new Uint8Array(pixels.buffer.slice(0)));
    return Skia.Image.MakeImage(
      { width: gridWidth, height: gridHeight, alphaType: AlphaType.Unpremul, colorType: ColorType.RGBA_8888 },
      data,
      gridWidth * 4,
    );
    // `version` zmienia się z każdą klatką – bufor jest mutowany w miejscu.
  }, [pixels, version, gridWidth, gridHeight]);
  const scale = Math.max(1, Math.floor(Math.min(width / gridWidth, height / gridHeight)));
  const w = gridWidth * scale;
  const h = gridHeight * scale;
  return (
    <Canvas testID={testID} style={{ width, height }}>
      {image ? (
        <Image
          image={image}
          x={Math.floor((width - w) / 2)}
          y={Math.floor((height - h) / 2)}
          width={w}
          height={h}
          fit="fill"
          sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
        />
      ) : null}
    </Canvas>
  );
}
