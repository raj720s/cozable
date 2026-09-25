import { cocoLabel } from './cocoLabels';

/** Inspected from yolov8n_int8.tflite (Ultralytics export, end2end=false). */
export const YOLO_INPUT_SIZE = 640;
export const YOLO_NUM_CLASSES = 80;
export const YOLO_NUM_ATTRS = 4 + YOLO_NUM_CLASSES; // 84
/** Default anchors for imgsz=640 (80²+40²+20²). */
export const YOLO_NUM_ANCHORS = 8400;

export const YOLO_CONF_THRESH = 0.45;
export const YOLO_IOU_THRESH = 0.45;

export type YoloDetection = {
  /** Top-left X in normalized source-frame coords (0..1). */
  x: number;
  /** Top-left Y in normalized source-frame coords (0..1). */
  y: number;
  width: number;
  height: number;
  classId: number;
  confidence: number;
  label: string;
};

export type LetterboxMeta = {
  scale: number;
  padX: number;
  padY: number;
  srcW: number;
  srcH: number;
  size: number;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function iou(a: YoloDetection, b: YoloDetection): number {
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
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}

export function nms(
  detections: YoloDetection[],
  iouThresh = YOLO_IOU_THRESH,
): YoloDetection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const keep: YoloDetection[] = [];
  const suppressed = new Array(sorted.length).fill(false);

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed[i]) continue;
    const a = sorted[i]!;
    keep.push(a);
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed[j]) continue;
      const b = sorted[j]!;
      if (a.classId === b.classId && iou(a, b) > iouThresh) {
        suppressed[j] = true;
      }
    }
  }
  return keep;
}

/**
 * Letterbox RGB(A)/BGRA pixels → NCHW float32 [1,3,S,S] in 0..1 (Ultralytics).
 * Runs on the JS thread (not the Skia worklet).
 */
export function letterboxToYoloNchw(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  opts: {
    channels: number;
    isBgra: boolean;
    size?: number;
    /** Row stride in bytes; defaults to srcW * channels. */
    stride?: number;
  },
): { input: ArrayBuffer; meta: LetterboxMeta } {
  const size = opts.size ?? YOLO_INPUT_SIZE;
  const scale = Math.min(size / srcW, size / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const padX = Math.floor((size - newW) / 2);
  const padY = Math.floor((size - newH) / 2);
  const channels = opts.channels;
  const isBgra = opts.isBgra;
  const stride = opts.stride ?? srcW * channels;

  const plane = size * size;
  const out = new Float32Array(3 * plane);
  // Ultralytics pad color ≈ 114
  const pad = 114 / 255;
  out.fill(pad);

  for (let y = 0; y < newH; y++) {
    const sy = Math.min(srcH - 1, Math.floor(y / scale));
    for (let x = 0; x < newW; x++) {
      const sx = Math.min(srcW - 1, Math.floor(x / scale));
      const si = sy * stride + sx * channels;
      let r: number;
      let g: number;
      let b: number;
      if (isBgra) {
        b = src[si] ?? 0;
        g = src[si + 1] ?? 0;
        r = src[si + 2] ?? 0;
      } else {
        r = src[si] ?? 0;
        g = src[si + 1] ?? 0;
        b = src[si + 2] ?? 0;
      }
      const dx = x + padX;
      const dy = y + padY;
      const di = dy * size + dx;
      out[0 * plane + di] = r / 255;
      out[1 * plane + di] = g / 255;
      out[2 * plane + di] = b / 255;
    }
  }

  return {
    input: out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength),
    meta: { scale, padX, padY, srcW, srcH, size },
  };
}

/**
 * Decode YOLOv8 raw head [1,84,8400] → filtered + NMS detections in normalized coords.
 */
export function decodeYoloV8(
  raw: Float32Array,
  meta: LetterboxMeta,
  confThresh = YOLO_CONF_THRESH,
  iouThresh = YOLO_IOU_THRESH,
  shape: { channels: number; anchors: number } = {
    channels: YOLO_NUM_ATTRS,
    anchors: YOLO_NUM_ANCHORS,
  },
): YoloDetection[] {
  const { channels, anchors } = shape;
  const numClasses = channels - 4;
  const candidates: YoloDetection[] = [];

  // Heuristic: if class scores look like logits (|x| often > 1), apply sigmoid.
  let needsSigmoid = false;
  for (let i = 0; i < Math.min(anchors, 32); i++) {
    const s = raw[4 * anchors + i] ?? 0;
    if (s < 0 || s > 1.05) {
      needsSigmoid = true;
      break;
    }
  }

  for (let i = 0; i < anchors; i++) {
    let bestCls = 0;
    let bestScore = -Infinity;
    for (let c = 0; c < numClasses; c++) {
      let s = raw[(4 + c) * anchors + i] ?? -Infinity;
      if (needsSigmoid) s = sigmoid(s);
      if (s > bestScore) {
        bestScore = s;
        bestCls = c;
      }
    }
    if (bestScore < confThresh) continue;

    const cx = raw[0 * anchors + i] ?? 0;
    const cy = raw[1 * anchors + i] ?? 0;
    const w = raw[2 * anchors + i] ?? 0;
    const h = raw[3 * anchors + i] ?? 0;

    // Map letterbox pixels → original frame → normalize 0..1
    const x0 = (cx - w / 2 - meta.padX) / meta.scale;
    const y0 = (cy - h / 2 - meta.padY) / meta.scale;
    const x1 = (cx + w / 2 - meta.padX) / meta.scale;
    const y1 = (cy + h / 2 - meta.padY) / meta.scale;

    const nx = clamp01(x0 / meta.srcW);
    const ny = clamp01(y0 / meta.srcH);
    const nw = clamp01(x1 / meta.srcW) - nx;
    const nh = clamp01(y1 / meta.srcH) - ny;
    if (nw <= 0.002 || nh <= 0.002) continue;

    candidates.push({
      x: nx,
      y: ny,
      width: nw,
      height: nh,
      classId: bestCls,
      confidence: bestScore,
      label: cocoLabel(bestCls),
    });
  }

  return nms(candidates, iouThresh);
}

/** Exponential smooth of matching boxes (by class + IoU). */
export function smoothDetections(
  previous: YoloDetection[],
  next: YoloDetection[],
  alpha = 0.4,
): YoloDetection[] {
  if (previous.length === 0) return next;
  const used = new Set<number>();
  const out: YoloDetection[] = [];

  for (const n of next) {
    let bestIdx = -1;
    let bestIoU = 0.15;
    for (let i = 0; i < previous.length; i++) {
      if (used.has(i)) continue;
      const p = previous[i]!;
      if (p.classId !== n.classId) continue;
      const v = iou(p, n);
      if (v > bestIoU) {
        bestIoU = v;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      const p = previous[bestIdx]!;
      const a = alpha;
      const b = 1 - a;
      out.push({
        ...n,
        x: p.x * b + n.x * a,
        y: p.y * b + n.y * a,
        width: p.width * b + n.width * a,
        height: p.height * b + n.height * a,
        confidence: p.confidence * b + n.confidence * a,
      });
    } else {
      out.push(n);
    }
  }
  return out;
}
