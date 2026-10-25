import { useEffect, useRef } from 'react';
import type { PixelCanvasProps } from './PixelCanvas.types';

/**
 * Web (Expo web – DevCatalog i podgląd): zwykły `<canvas>` jak w prototypie, bez ładowania
 * CanvasKit (WASM) dla Skia.
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
  const ref = useRef<HTMLCanvasElement>(null);
  const low = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!low.current) {
      low.current = document.createElement('canvas');
      low.current.width = gridWidth;
      low.current.height = gridHeight;
    }
    const lctx = low.current.getContext('2d');
    const ctx = canvas.getContext('2d');
    if (!lctx || !ctx) return;
    const img = lctx.createImageData(gridWidth, gridHeight);
    new Uint32Array(img.data.buffer).set(pixels);
    lctx.putImageData(img, 0, 0);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const s = Math.max(1, Math.floor(Math.min(canvas.width / gridWidth, canvas.height / gridHeight)));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      low.current,
      Math.floor((canvas.width - gridWidth * s) / 2),
      Math.floor((canvas.height - gridHeight * s) / 2),
      gridWidth * s,
      gridHeight * s,
    );
  }, [pixels, version, gridWidth, gridHeight, width, height]);

  return <canvas ref={ref} data-testid={testID} style={{ width, height, display: 'block' }} />;
}
