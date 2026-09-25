import type { Frame } from 'react-native-vision-camera';
import type { TfliteModel } from 'react-native-fast-tflite';
import {
  decodeYoloV8,
  letterboxToYoloNchw,
  YOLO_INPUT_SIZE,
  YOLO_NUM_ANCHORS,
  YOLO_NUM_ATTRS,
  type LetterboxMeta,
  type YoloDetection,
} from './yoloDecode';

/** Raw frame pixels copied on the Skia worklet — letterbox happens on JS. */
export type YoloFrameCopy = {
  pixels: ArrayBuffer;
  width: number;
  height: number;
  channels: number;
  isBgra: boolean;
  stride: number;
};

export type YoloPreparedInput = {
  input: ArrayBuffer;
  meta: LetterboxMeta;
};

export const YOLO_INPUT_BYTES =
  1 * 3 * YOLO_INPUT_SIZE * YOLO_INPUT_SIZE * Float32Array.BYTES_PER_ELEMENT;

function framePixelLayout(frame: Frame): {
  channels: number;
  isBgra: boolean;
  stride: number;
} {
  'worklet';
  const width = frame.width;
  const stride = Math.max(frame.bytesPerRow, width * 3);
  const format = String(frame.pixelFormat);
  const isBgra = format.includes('bgra');
  const isRgba = format.includes('rgba') && !isBgra;
  const channels =
    stride >= width * 4 ? 4 : stride >= width * 3 ? 3 : isBgra || isRgba ? 4 : 3;
  return { channels, isBgra, stride };
}

/**
 * Cheap worklet-side copy of frame pixels. Do NOT letterbox here —
 * a 640³ float tensor (~5MB) often fails to cross scheduleOnRN intact.
 */
export function copyFrameForYolo(frame: Frame): YoloFrameCopy | null {
  'worklet';
  if (!frame.hasPixelBuffer || frame.width <= 0 || frame.height <= 0) {
    return null;
  }
  const raw = frame.getPixelBuffer();
  // Detach from Frame lifetime before dispose().
  const pixels = raw.slice(0);
  const { channels, isBgra, stride } = framePixelLayout(frame);
  return {
    pixels,
    width: frame.width,
    height: frame.height,
    channels,
    isBgra,
    stride,
  };
}

/** JS-thread: letterbox copied pixels → NCHW float32 for TFLite. */
export function prepareYoloInputFromCopy(copy: YoloFrameCopy): YoloPreparedInput {
  const src = new Uint8Array(copy.pixels);
  return letterboxToYoloNchw(src, copy.width, copy.height, {
    channels: copy.channels,
    isBgra: copy.isBgra,
    stride: copy.stride,
    size: YOLO_INPUT_SIZE,
  });
}

export function prepareYoloInputFromRgba(
  rgba: Uint8Array,
  width: number,
  height: number,
): YoloPreparedInput {
  return letterboxToYoloNchw(rgba, width, height, {
    channels: 4,
    isBgra: false,
    size: YOLO_INPUT_SIZE,
  });
}

/**
 * Run YOLO TFLite and decode detections.
 * Output layout is inspected at runtime when possible.
 */
export function runYoloDetect(
  model: TfliteModel,
  prepared: YoloPreparedInput,
): YoloDetection[] {
  const expected =
    model.inputs[0] != null
      ? tensorByteSize(model.inputs[0].shape, model.inputs[0].dataType)
      : YOLO_INPUT_BYTES;
  const actual = prepared.input.byteLength;
  if (actual !== expected) {
    throw new Error(
      `YOLO input size mismatch: got ${actual} bytes, expected ${expected}`,
    );
  }

  const outputs = model.runSync([prepared.input]);
  const output = outputs[0];
  if (output == null) return [];

  const outInfo = model.outputs[0];
  const shape = outInfo?.shape ?? [1, YOLO_NUM_ATTRS, YOLO_NUM_ANCHORS];
  let channels = YOLO_NUM_ATTRS;
  let anchors = YOLO_NUM_ANCHORS;
  if (shape.length >= 3) {
    const a = shape[1] ?? YOLO_NUM_ATTRS;
    const b = shape[2] ?? YOLO_NUM_ANCHORS;
    if (a === YOLO_NUM_ATTRS || a === 4 + 80) {
      channels = a;
      anchors = b;
    } else if (b === YOLO_NUM_ATTRS || b === 4 + 80) {
      channels = b;
      anchors = a;
      const raw = floatView(output, outInfo?.dataType);
      return decodeYoloV8Transposed(raw, prepared.meta, channels, anchors);
    } else {
      channels = a;
      anchors = b;
    }
  }

  const raw = floatView(output, outInfo?.dataType);
  return decodeYoloV8(raw, prepared.meta, undefined, undefined, {
    channels,
    anchors,
  });
}

function tensorByteSize(shape: number[], dataType: string): number {
  const elems = shape.reduce((a, b) => a * b, 1);
  switch (dataType) {
    case 'float32':
    case 'int32':
    case 'uint32':
      return elems * 4;
    case 'float16':
    case 'int16':
    case 'uint16':
      return elems * 2;
    case 'int8':
    case 'uint8':
    case 'bool':
      return elems;
    default:
      return elems * 4;
  }
}

function floatView(
  buffer: ArrayBuffer,
  dataType: string | undefined,
): Float32Array {
  if (dataType === 'int8') {
    const q = new Int8Array(buffer);
    const out = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) out[i] = (q[i] ?? 0) / 127;
    return out;
  }
  if (dataType === 'uint8') {
    const q = new Uint8Array(buffer);
    const out = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) out[i] = (q[i] ?? 0) / 255;
    return out;
  }
  return new Float32Array(buffer);
}

/** Decode when output is [1, anchors, 84]. */
function decodeYoloV8Transposed(
  raw: Float32Array,
  meta: LetterboxMeta,
  channels: number,
  anchors: number,
): YoloDetection[] {
  const planar = new Float32Array(channels * anchors);
  for (let i = 0; i < anchors; i++) {
    for (let c = 0; c < channels; c++) {
      planar[c * anchors + i] = raw[i * channels + c] ?? 0;
    }
  }
  return decodeYoloV8(planar, meta, undefined, undefined, { channels, anchors });
}
