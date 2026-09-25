import { Directory, File, Paths } from 'expo-file-system';
import type { CaptureKind, CaptureMedia, GalleryItem } from '../types';
import { MAX_GALLERY_ITEMS } from '../types';
import { toMediaUri } from './scanHelpers';

const GALLERY_DIR = new Directory(Paths.document, 'gallery');
const INDEX_FILE = new File(GALLERY_DIR, 'index.json');

function ensureGalleryDir(): void {
  if (!GALLERY_DIR.exists) {
    GALLERY_DIR.create({ intermediates: true, idempotent: true });
  }
}

function extensionFor(kind: CaptureKind, sourcePath: string): string {
  const lower = sourcePath.toLowerCase();
  if (kind === 'photo') {
    if (lower.includes('.png')) return '.png';
    if (lower.includes('.webp')) return '.webp';
    return '.jpg';
  }
  if (lower.includes('.mov')) return '.mov';
  if (lower.includes('.webm')) return '.webm';
  return '.mp4';
}

function safeDeleteFile(uri: string): void {
  try {
    const file = new File(toMediaUri(uri));
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Failed to delete gallery media', uri, error);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sumGalleryBytes(items: GalleryItem[]): number {
  return items.reduce((sum, item) => sum + (item.media.byteSize ?? 0), 0);
}

export async function loadGalleryIndex(): Promise<GalleryItem[]> {
  try {
    ensureGalleryDir();
    if (!INDEX_FILE.exists) return [];
    const raw = INDEX_FILE.textSync();
    const parsed = JSON.parse(raw) as GalleryItem[];
    if (!Array.isArray(parsed)) return [];
    // Drop entries whose media file vanished (OS cleanup / manual wipe).
    return parsed.filter((item) => {
      try {
        return new File(toMediaUri(item.media.path)).exists;
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.warn('Failed to load gallery index', error);
    return [];
  }
}

export async function writeGalleryIndex(items: GalleryItem[]): Promise<void> {
  ensureGalleryDir();
  if (!INDEX_FILE.exists) {
    INDEX_FILE.create({ intermediates: true });
  }
  INDEX_FILE.write(JSON.stringify(items));
}

/** Copy a VisionCamera temp path into durable document storage. */
export async function persistCaptureMedia(
  media: CaptureMedia,
  id: string,
): Promise<CaptureMedia> {
  ensureGalleryDir();
  const source = new File(toMediaUri(media.path));
  if (!source.exists) {
    throw new Error('Capture file is missing from temporary storage.');
  }

  const ext = extensionFor(media.kind, media.path);
  const destination = new File(GALLERY_DIR, `${id}${ext}`);
  if (destination.exists) {
    destination.delete();
  }
  await source.copy(destination);

  let byteSize = media.byteSize;
  try {
    byteSize = destination.size;
  } catch {
    // size may be unavailable on some platforms
  }

  return {
    ...media,
    path: destination.uri,
    byteSize,
  };
}

export async function pruneGalleryItems(
  items: GalleryItem[],
  maxItems: number = MAX_GALLERY_ITEMS,
): Promise<GalleryItem[]> {
  if (items.length <= maxItems) return items;

  // Newest first → keep head, prune tail.
  const kept = items.slice(0, maxItems);
  const removed = items.slice(maxItems);
  for (const item of removed) {
    safeDeleteFile(item.media.path);
  }
  return kept;
}

export async function deleteGalleryItemFiles(item: GalleryItem): Promise<void> {
  safeDeleteFile(item.media.path);
}

export async function clearAllGalleryFiles(items: GalleryItem[]): Promise<void> {
  for (const item of items) {
    safeDeleteFile(item.media.path);
  }
  try {
    if (INDEX_FILE.exists) {
      INDEX_FILE.write('[]');
    }
  } catch (error) {
    console.warn('Failed to clear gallery index', error);
  }
}

export function createGalleryId(): string {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
