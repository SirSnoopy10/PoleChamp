export interface PixelCanvasProps {
  /** Piksele RGBA (ABGR little-endian) siatki `gridWidth × gridHeight`. */
  pixels: Uint32Array;
  /** Numer klatki – bufor jest mutowany w miejscu, więc zmiana wymusza ponowne rysowanie. */
  version: number;
  gridWidth: number;
  gridHeight: number;
  width: number;
  height: number;
  testID?: string;
}
