import type { DayColour, StoredYoloDetection, TrayDetection } from '../types';

/** classId order must match Kotlin LABELS. */
export const CLASS_ID_TO_DAY_COLOUR: DayColour[] = [
  'Black', // 0 Sunday
  'Blue', // 1 Monday
  'Brown', // 2 Thursday
  'Green', // 3 Friday
  'Orange', // 4 Saturday
  'Red', // 5 Wednesday
  'Yellow', // 6 Tuesday
];

export type TrackedLabel = {
  /** 1-based sequence in sweep order (first sighting). */
  label_sequence_number: number;
  day_colour: DayColour;
  confidence_score: number;
  /** ms since recording/session start when first seen. */
  frame_timestamp: number;
  classId: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lastSeenAt: number;
};

type RawDet = {
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number;
  confidence: number;
  label: string;
};

const MATCH_IOU = 0.28;
const MATCH_IOU_CROSS_CLASS = 0.55;

function iou(a: RawDet, b: Pick<TrackedLabel, 'x' | 'y' | 'width' | 'height'>): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  if (inter <= 0) return 0;
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function colourFor(classId: number, label: string): DayColour {
  if (classId >= 0 && classId < CLASS_ID_TO_DAY_COLOUR.length) {
    return CLASS_ID_TO_DAY_COLOUR[classId]!;
  }
  const head = label.split(':')[0]?.trim();
  const hit = CLASS_ID_TO_DAY_COLOUR.find((c) => c.toLowerCase() === head?.toLowerCase());
  return hit ?? 'Black';
}

/**
 * Temporal IoU tracker: same physical label across frames → one record.
 * Tracks persist after leaving the frame (coverage count does not drop).
 */
export class LabelTracker {
  private tracks: TrackedLabel[] = [];
  private nextSeq = 1;

  reset() {
    this.tracks = [];
    this.nextSeq = 1;
  }

  /** All distinct labels seen so far (stable order by first sighting). */
  getDistinct(): TrackedLabel[] {
    return this.tracks.slice();
  }

  get count(): number {
    return this.tracks.length;
  }

  update(dets: RawDet[], frameTimestampMs: number, nowMs = Date.now()): TrackedLabel[] {
    const unmatched = new Set(this.tracks.map((_, i) => i));

    for (const det of dets) {
      let bestIdx = -1;
      let bestIou = 0;
      for (const idx of unmatched) {
        const track = this.tracks[idx]!;
        const score = iou(det, track);
        const sameClass = det.classId === track.classId;
        const threshold = sameClass ? MATCH_IOU : MATCH_IOU_CROSS_CLASS;
        if (score >= threshold && score > bestIou) {
          bestIou = score;
          bestIdx = idx;
        }
      }

      if (bestIdx >= 0) {
        unmatched.delete(bestIdx);
        const track = this.tracks[bestIdx]!;
        track.x = det.x;
        track.y = det.y;
        track.width = det.width;
        track.height = det.height;
        track.lastSeenAt = nowMs;
        if (det.confidence >= track.confidence_score) {
          track.confidence_score = det.confidence;
          track.classId = det.classId;
          track.label = det.label;
          track.day_colour = colourFor(det.classId, det.label);
        }
      } else {
        this.tracks.push({
          label_sequence_number: this.nextSeq++,
          day_colour: colourFor(det.classId, det.label),
          confidence_score: det.confidence,
          frame_timestamp: Math.max(0, Math.round(frameTimestampMs)),
          classId: det.classId,
          label: det.label,
          x: det.x,
          y: det.y,
          width: det.width,
          height: det.height,
          lastSeenAt: nowMs,
        });
      }
    }

    return this.getDistinct();
  }
}

export function trackedToTrayDetections(tracks: TrackedLabel[]): TrayDetection[] {
  return tracks.map((t) => ({
    sequence: t.label_sequence_number,
    colour: t.day_colour,
    confidence: Number(t.confidence_score.toFixed(4)),
    frameTimestampMs: t.frame_timestamp,
    modelLabel: t.label,
  }));
}

export function trackedToStoredYolo(tracks: TrackedLabel[]): StoredYoloDetection[] {
  return tracks.map((t) => ({
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
    classId: t.classId,
    confidence: t.confidence_score,
    label: t.label,
  }));
}

/** One-shot: each box in a still is its own label (no temporal merge). */
export function yoloToTrayDetections(
  dets: Array<{
    classId: number;
    confidence: number;
    label: string;
  }>,
  frameTimestampMs = 0,
): TrayDetection[] {
  return dets.map((d, i) => ({
    sequence: i + 1,
    colour: colourFor(d.classId, d.label),
    confidence: Number(d.confidence.toFixed(4)),
    frameTimestampMs,
    modelLabel: d.label,
  }));
}
