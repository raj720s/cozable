import type { TfliteModel } from 'react-native-fast-tflite';
import type { Frame } from 'react-native-vision-camera';
import { IMAGENET_LABELS } from './imagenetLabels';

export const MOBILENET_INPUT_SIZE = 224;

export type NormBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ClassificationResult = {
  index: number;
  label: string;
  score: number;
  /** Box in normalized upright preview coords (0..1). */
  box: NormBox;
  /** True once score crossed the lock threshold. */
  locked?: boolean;
};

type TensorDataType = TfliteModel['outputs'][number]['dataType'];

type RegionSpec = NormBox;

type PreparedRegion = {
  input: ArrayBuffer;
  box: NormBox;
};

/** Overlapping search windows — MobileNet has no boxes, so we localize by best crop. */
export const SEARCH_REGIONS: RegionSpec[] = [
  { x: 0.22, y: 0.22, width: 0.56, height: 0.56 }, // center
  { x: 0.04, y: 0.08, width: 0.42, height: 0.42 }, // top-left
  { x: 0.54, y: 0.08, width: 0.42, height: 0.42 }, // top-right
  { x: 0.04, y: 0.50, width: 0.42, height: 0.42 }, // bottom-left
  { x: 0.54, y: 0.50, width: 0.42, height: 0.42 }, // bottom-right
];

export const CENTER_BOX: NormBox = SEARCH_REGIONS[0]!;

export const EMPTY_PREDICTION: ClassificationResult = {
  index: -1,
  label: '—',
  score: 0,
  box: CENTER_BOX,
  locked: false,
};

function clamp01(v: number): number {
  'worklet';
  return Math.max(0, Math.min(1, v));
}

/** Nearest-neighbor crop+resize of one normalized region → 224×224×3 UINT8. */
export function regionToMobileNetInput(
  frame: Frame,
  region: NormBox,
): ArrayBuffer | null {
  'worklet';
  if (!frame.hasPixelBuffer || frame.width <= 0 || frame.height <= 0) {
    return null;
  }

  const src = new Uint8Array(frame.getPixelBuffer());
  const width = frame.width;
  const height = frame.height;
  const stride = Math.max(frame.bytesPerRow, width * 3);
  const format = String(frame.pixelFormat);
  const isBgra = format.includes('bgra');
  const isRgba = format.includes('rgba') && !isBgra;
  const channels =
    stride >= width * 4 ? 4 : stride >= width * 3 ? 3 : isBgra || isRgba ? 4 : 3;

  const rx = Math.floor(clamp01(region.x) * width);
  const ry = Math.floor(clamp01(region.y) * height);
  const rw = Math.max(1, Math.floor(clamp01(region.width) * width));
  const rh = Math.max(1, Math.floor(clamp01(region.height) * height));

  const size = MOBILENET_INPUT_SIZE;
  const out = new Uint8Array(size * size * 3);

  for (let y = 0; y < size; y++) {
    const sy = Math.min(height - 1, ry + Math.floor((y * rh) / size));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(width - 1, rx + Math.floor((x * rw) / size));
      const si = sy * stride + sx * channels;
      const di = (y * size + x) * 3;

      if (isBgra || (channels === 4 && !isRgba)) {
        out[di] = src[si + 2] ?? 0;
        out[di + 1] = src[si + 1] ?? 0;
        out[di + 2] = src[si] ?? 0;
      } else {
        out[di] = src[si] ?? 0;
        out[di + 1] = src[si + 1] ?? 0;
        out[di + 2] = src[si + 2] ?? 0;
      }
    }
  }

  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

/** Full-frame resize (legacy helper). */
export function frameToMobileNetInput(frame: Frame): ArrayBuffer | null {
  'worklet';
  return regionToMobileNetInput(frame, {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
}

/**
 * Copy all search-region tensors while the Frame is still valid.
 * Safe to run after Skia `render(...)` and before `frame.dispose()`.
 */
export function prepareSearchRegionInputs(frame: Frame): PreparedRegion[] {
  'worklet';
  const prepared: PreparedRegion[] = [];
  for (let i = 0; i < SEARCH_REGIONS.length; i++) {
    const box = SEARCH_REGIONS[i]!;
    const input = regionToMobileNetInput(frame, box);
    if (input != null) {
      prepared.push({ input, box });
    }
  }
  return prepared;
}

export function top1FromOutput(
  buffer: ArrayBuffer,
  dataType: TensorDataType,
): { index: number; score: number } {
  'worklet';
  let bestIndex = 0;
  let bestScore = -Infinity;

  if (dataType === 'float32') {
    const scores = new Float32Array(buffer);
    for (let i = 0; i < scores.length; i++) {
      const value = scores[i] ?? -Infinity;
      if (value > bestScore) {
        bestScore = value;
        bestIndex = i;
      }
    }
    return { index: bestIndex, score: bestScore };
  }

  if (dataType === 'int8') {
    const scores = new Int8Array(buffer);
    for (let i = 0; i < scores.length; i++) {
      const value = scores[i] ?? -128;
      if (value > bestScore) {
        bestScore = value;
        bestIndex = i;
      }
    }
    return { index: bestIndex, score: (bestScore + 128) / 255 };
  }

  const scores = new Uint8Array(buffer);
  for (let i = 0; i < scores.length; i++) {
    const value = scores[i] ?? 0;
    if (value > bestScore) {
      bestScore = value;
      bestIndex = i;
    }
  }
  return { index: bestIndex, score: bestScore / 255 };
}

export function labelForIndex(index: number): string {
  'worklet';
  return IMAGENET_LABELS[index] ?? `class_${index}`;
}

function classifyPreparedInput(
  model: TfliteModel,
  input: ArrayBuffer,
  box: NormBox,
): ClassificationResult | null {
  'worklet';
  const outputs = model.runSync([input]);
  const output = outputs[0];
  if (output == null) return null;

  const dataType = model.outputs[0]?.dataType ?? 'uint8';
  const { index, score } = top1FromOutput(output, dataType);
  // Skip ImageNet "background" — prefer a real class when possible.
  if (index === 0 && score < 0.85) {
    return null;
  }
  return {
    index,
    label: labelForIndex(index),
    score,
    box,
  };
}

/**
 * Run MobileNet on pre-copied region tensors (async-safe — no Frame needed).
 * Picks the highest-scoring region so the Skia box can track that crop.
 */
export function classifyPreparedRegions(
  model: TfliteModel,
  regions: PreparedRegion[],
): ClassificationResult | null {
  'worklet';
  let best: ClassificationResult | null = null;

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]!;
    try {
      const result = classifyPreparedInput(model, region.input, region.box);
      if (result == null) continue;
      if (best == null || result.score > best.score) {
        best = result;
      }
    } catch {
      // Keep scanning other regions.
    }
  }

  return best;
}

/** Exponential smooth so the box doesn't jump every inference. */
export function smoothPrediction(
  previous: ClassificationResult,
  next: ClassificationResult,
  alpha = 0.35,
): ClassificationResult {
  'worklet';
  if (previous.index < 0) return next;
  const a = alpha;
  const b = 1 - a;
  return {
    index: next.index,
    label: next.label,
    score: previous.score * b + next.score * a,
    locked: previous.locked === true || next.locked === true,
    box: {
      x: previous.box.x * b + next.box.x * a,
      y: previous.box.y * b + next.box.y * a,
      width: previous.box.width * b + next.box.width * a,
      height: previous.box.height * b + next.box.height * a,
    },
  };
}

/**
 * Resize full frame → MobileNet.runSync → top-1 (legacy sync helper).
 */
export function classifyFrame(
  model: TfliteModel,
  frame: Frame,
): ClassificationResult | null {
  'worklet';
  const input = frameToMobileNetInput(frame);
  if (input == null) return null;
  return classifyPreparedInput(model, input, CENTER_BOX);
}
