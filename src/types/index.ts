/** Seven day-colour markings for tray labels (docs ground truth). */
export type DayColour =
  | 'Blue'
  | 'Yellow'
  | 'Red'
  | 'Brown'
  | 'Green'
  | 'Orange'
  | 'Black';

export const DAY_COLOURS: DayColour[] = [
  'Blue',
  'Yellow',
  'Red',
  'Brown',
  'Green',
  'Orange',
  'Black',
];

export const DAY_COLOUR_HEX: Record<DayColour, string> = {
  Blue: '#2563EB',
  Yellow: '#EAB308',
  Red: '#DC2626',
  Brown: '#854D0E',
  Green: '#16A34A',
  Orange: '#EA580C',
  Black: '#1E293B',
};

/** Summary / audit verification threshold (stitch designs use 85%). */
export const CONFIDENCE_THRESHOLD = 0.85;

/** Live/gallery MobileNet results lock once score reaches this. */
export const CLASSIFY_LOCK_SCORE = 0.5;

export interface TrayDetection {
  /** 1-based tray sequence number in the rack. */
  sequence: number;
  colour: DayColour;
  confidence: number;
  /** Optional ImageNet / model label when available. */
  modelLabel?: string;
}

export type CaptureKind = 'photo' | 'video';

export interface CaptureMedia {
  kind: CaptureKind;
  /** Filesystem path (not always a file:// URI). */
  path: string;
  width?: number;
  height?: number;
  capturedAt: number;
  /** Approximate on-disk size in bytes when known. */
  byteSize?: number;
}

/** Soft cap for gallery memory — oldest captures are pruned first. */
export const MAX_GALLERY_ITEMS = 20;

/** Normalized YOLO box persisted with gallery captures. */
export interface StoredYoloDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number;
  confidence: number;
  label: string;
}

export interface StoredClassification {
  index: number;
  label: string;
  score: number;
  locked: boolean;
  classifiedAt: number;
}

/** Persisted capture + its audit payload for the gallery. */
export interface GalleryItem {
  id: string;
  media: CaptureMedia;
  detections: TrayDetection[];
  expectedCount: number;
  createdAt: number;
  /** Top-class summary when YOLO ran on this capture. */
  classification?: StoredClassification;
  /** Full YOLO boxes for this capture (normalized 0..1). */
  yoloDetections?: StoredYoloDetection[];
}

export interface PredictionLogEntry {
  id: string;
  at: number;
  source: 'live' | 'gallery';
  galleryId?: string;
  label: string;
  score: number;
  index: number;
  locked: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
