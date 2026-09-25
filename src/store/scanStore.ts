import { create } from 'zustand';
import type { ClassificationResult } from '../ml/classifyFrame';
import type {
  CaptureMedia,
  GalleryItem,
  PredictionLogEntry,
  StoredClassification,
  TrayDetection,
} from '../types';
import { MAX_GALLERY_ITEMS } from '../types';
import {
  clearAllGalleryFiles,
  createGalleryId,
  deleteGalleryItemFiles,
  loadGalleryIndex,
  persistCaptureMedia,
  pruneGalleryItems,
  sumGalleryBytes,
  writeGalleryIndex,
} from '../utils/galleryStorage';
import { buildDummyDetections } from '../utils/scanHelpers';

const MAX_PREDICTION_LOG = 80;

function toStoredClassification(
  result: ClassificationResult,
  locked: boolean,
): StoredClassification {
  return {
    index: result.index,
    label: result.label,
    score: result.score,
    locked,
    classifiedAt: Date.now(),
  };
}

function makeLogEntry(
  result: ClassificationResult,
  source: PredictionLogEntry['source'],
  locked: boolean,
  galleryId?: string,
): PredictionLogEntry {
  return {
    id: `pred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    source,
    galleryId,
    label: result.label,
    score: result.score,
    index: result.index,
    locked,
  };
}

interface ScanState {
  expectedCount: number;
  detections: TrayDetection[];
  captureMedia: CaptureMedia | null;
  activeGalleryId: string | null;
  gallery: GalleryItem[];
  galleryHydrated: boolean;
  isScanning: boolean;
  /** Rolling MobileNet response log (live + gallery). */
  predictionLog: PredictionLogEntry[];
  setExpectedCount: (count: number) => void;
  setDetections: (detections: TrayDetection[]) => void;
  setCaptureMedia: (media: CaptureMedia | null) => void;
  logPrediction: (
    result: ClassificationResult,
    source: PredictionLogEntry['source'],
    locked: boolean,
    galleryId?: string,
  ) => void;
  clearPredictionLog: () => void;
  completeCapture: (
    media: CaptureMedia,
    expectedCount?: number,
    classification?: ClassificationResult | null,
  ) => Promise<GalleryItem | null>;
  updateGalleryClassification: (
    id: string,
    classification: StoredClassification,
  ) => Promise<void>;
  openGalleryItem: (id: string) => boolean;
  removeGalleryItem: (id: string) => Promise<void>;
  clearGallery: () => Promise<void>;
  hydrateGallery: () => Promise<void>;
  resetScan: () => void;
  startScan: () => void;
  stopScan: () => void;
  galleryBytesUsed: () => number;
}

export const useScanStore = create<ScanState>((set, get) => ({
  expectedCount: 9,
  detections: [],
  captureMedia: null,
  activeGalleryId: null,
  gallery: [],
  galleryHydrated: false,
  isScanning: false,
  predictionLog: [],
  setExpectedCount: (count) => set({ expectedCount: count }),
  setDetections: (detections) => set({ detections }),
  setCaptureMedia: (media) => set({ captureMedia: media }),

  logPrediction: (result, source, locked, galleryId) => {
    if (result.index < 0) return;
    const entry = makeLogEntry(result, source, locked, galleryId);
    console.log(
      `[YOLO] ${source}${galleryId ? `:${galleryId}` : ''} → ${entry.label} ${(entry.score * 100).toFixed(1)}%${
        locked ? ' LOCKED' : ''
      }`,
    );
    set({
      predictionLog: [entry, ...get().predictionLog].slice(0, MAX_PREDICTION_LOG),
    });
  },

  clearPredictionLog: () => set({ predictionLog: [] }),

  hydrateGallery: async () => {
    const items = await loadGalleryIndex();
    set({ gallery: items, galleryHydrated: true });
  },

  completeCapture: async (media, expectedCount, classification) => {
    const count = expectedCount ?? get().expectedCount;
    const detections = buildDummyDetections(count);
    const id = createGalleryId();
    const createdAt = Date.now();
    const stored =
      classification != null && classification.index >= 0
        ? toStoredClassification(
            classification,
            classification.locked === true || classification.score >= 0.5,
          )
        : undefined;

    try {
      const persistedMedia = await persistCaptureMedia(media, id);
      const item: GalleryItem = {
        id,
        media: persistedMedia,
        detections,
        expectedCount: count,
        createdAt,
        classification: stored,
      };

      const nextGallery = await pruneGalleryItems([item, ...get().gallery], MAX_GALLERY_ITEMS);
      await writeGalleryIndex(nextGallery);

      if (stored) {
        get().logPrediction(classification!, 'live', stored.locked, id);
      }

      set({
        expectedCount: count,
        captureMedia: persistedMedia,
        detections,
        activeGalleryId: id,
        gallery: nextGallery,
        isScanning: false,
      });
      return item;
    } catch (error) {
      console.warn('Gallery persist failed — showing temp capture only', error);
      set({
        expectedCount: count,
        captureMedia: media,
        detections,
        activeGalleryId: null,
        isScanning: false,
      });
      return null;
    }
  },

  updateGalleryClassification: async (id, classification) => {
    const next = get().gallery.map((item) =>
      item.id === id ? { ...item, classification } : item,
    );
    await writeGalleryIndex(next);
    set({ gallery: next });
  },

  openGalleryItem: (id) => {
    const item = get().gallery.find((g) => g.id === id);
    if (!item) return false;
    set({
      activeGalleryId: item.id,
      captureMedia: item.media,
      detections: item.detections,
      expectedCount: item.expectedCount,
      isScanning: false,
    });
    return true;
  },

  removeGalleryItem: async (id) => {
    const current = get().gallery;
    const target = current.find((g) => g.id === id);
    if (!target) return;

    await deleteGalleryItemFiles(target);
    const next = current.filter((g) => g.id !== id);
    await writeGalleryIndex(next);

    const clearingActive = get().activeGalleryId === id;
    set({
      gallery: next,
      ...(clearingActive
        ? { activeGalleryId: null, captureMedia: null, detections: [] }
        : {}),
    });
  },

  clearGallery: async () => {
    await clearAllGalleryFiles(get().gallery);
    set({
      gallery: [],
      activeGalleryId: null,
      captureMedia: null,
      detections: [],
    });
  },

  resetScan: () =>
    set({
      detections: [],
      captureMedia: null,
      activeGalleryId: null,
      isScanning: false,
    }),
  startScan: () =>
    set({ isScanning: true, detections: [], captureMedia: null, activeGalleryId: null }),
  stopScan: () => set({ isScanning: false }),
  galleryBytesUsed: () => sumGalleryBytes(get().gallery),
}));
