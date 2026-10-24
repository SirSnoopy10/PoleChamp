import { color } from './color.js';

/** Role semantyczne – komponenty używają ich zamiast surowych stopni ramp (09-design-system §2.1). */
export const role = {
  textPrimary: color.text,
  textSecondary: color.neutral[400],
  textTertiary: color.neutral[500],
  textOnTint: color.accentRamp[200],
  textOnTintMuted: color.accentRamp[300],
  iconMuted: color.neutral[500],
  iconSubtle: color.neutral[600],
  borderSubtle: color.divider,
  borderEdge: color.neutral[800],
  /** Adaptacja a11y (NFR-202): obrys pola w spoczynku 3,52:1 na surface zamiast samego divider. */
  borderInput: color.neutral[600],
  focusRing: color.accent,
  error: color.accentRamp[300],
  statusLive: { dot: color.accent, background: color.accentRamp[900], text: color.accentRamp[300] },
  statusDone: { dot: color.neutral[500], background: color.neutral[900], text: color.neutral[300] },
  statusDraft: {
    dot: color.neutral[600],
    background: 'transparent',
    text: color.neutral[300],
    border: color.divider,
  },
  sheetBackdrop: color.overlay.sheetBackdrop,
  dialogBackdrop: color.overlay.dialogBackdrop,
} as const;
