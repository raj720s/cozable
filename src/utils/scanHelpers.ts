import {
  CONFIDENCE_THRESHOLD,
  DAY_COLOURS,
  type CaptureMedia,
  type DayColour,
  type TrayDetection,
} from '../types';

/** Deterministic-ish dummy detections for summary UI while live ML is paused. */
export function buildDummyDetections(expectedCount: number): TrayDetection[] {
  const count = Math.max(1, Math.min(expectedCount, 12));
  // Leave 0–2 "missing" so the summary can show the coverage warning.
  const detected = Math.max(1, count - (count > 3 ? 2 : count > 1 ? 1 : 0));

  return Array.from({ length: detected }, (_, i) => {
    const colour = DAY_COLOURS[i % DAY_COLOURS.length] as DayColour;
    // Alternate high / low confidence so amber flags appear in the audit list.
    const confidence =
      i % 3 === 1
        ? 0.55 + (i % 5) * 0.02
        : 0.88 + (i % 7) * 0.01;
    return {
      sequence: i + 1,
      colour,
      confidence: Math.min(0.99, Number(confidence.toFixed(2))),
      modelLabel: `dummy-${colour.toLowerCase()}`,
    };
  });
}

export function isHighConfidence(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD;
}

export function toMediaUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  return `file://${path}`;
}

export function describeCapture(media: CaptureMedia | null): string {
  if (!media) return 'No capture attached';
  if (media.kind === 'photo') {
    return media.width && media.height
      ? `Photo · ${media.width}×${media.height}`
      : 'Photo capture';
  }
  return 'Video sweep';
}
