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
  Brown: '#92400E',
  Green: '#16A34A',
  Orange: '#EA580C',
  Black: '#111827',
};

export const CONFIDENCE_THRESHOLD = 0.6;

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
  /** MobileNet ImageNet result when classified. */
  classification?: StoredClassification;
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
