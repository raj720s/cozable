import {
    AlphaType,
    ColorType,
    Skia,
} from '@shopify/react-native-skia';
import type { TfliteModel } from 'react-native-fast-tflite';
import { CLASSIFY_LOCK_SCORE } from '../types';
import {
    MOBILENET_INPUT_SIZE,
    SEARCH_REGIONS,
    classifyPreparedRegions,
    labelForIndex,
    top1FromOutput,
    type ClassificationResult,
    type NormBox,
} from './classifyFrame';

const FULL_FRAME: NormBox = { x: 0, y: 0, width: 1, height: 1 };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Resize one RGBA region into MobileNet UINT8 RGB input. */
function rgbaRegionToMobileNetInput(
  src: Uint8Array,
  width: number,
  height: number,
  region: NormBox,
): ArrayBuffer {
  const rx = Math.floor(clamp01(region.x) * width);
  const ry = Math.floor(clamp01(region.y) * height);
  const rw = Math.max(1, Math.floor(clamp01(region.width) * width));
  const rh = Math.max(1, Math.floor(clamp01(region.height) * height));
  const size = MOBILENET_INPUT_SIZE;
  const out = new Uint8Array(size * size * 3);
  const stride = width * 4;

  for (let y = 0; y < size; y++) {
    const sy = Math.min(height - 1, ry + Math.floor((y * rh) / size));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(width - 1, rx + Math.floor((x * rw) / size));
      const si = sy * stride + sx * 4;
      const di = (y * size + x) * 3;
      out[di] = src[si] ?? 0;
      out[di + 1] = src[si + 1] ?? 0;
      out[di + 2] = src[si + 2] ?? 0;
    }
  }

  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

/**
 * Classify a stored gallery photo with MobileNet (multi-crop, same as live).
 */
export async function classifyImageUri(
  model: TfliteModel,
  uri: string,
): Promise<ClassificationResult | null> {
  const data = await Skia.Data.fromURI(uri);
  const encoded = Skia.Image.MakeImageFromEncoded(data);
  if (encoded == null) {
    console.warn('[MobileNet] Could not decode image', uri);
    return null;
  }

  const image = encoded.makeNonTextureImage() ?? encoded;
  const width = image.width();
  const height = image.height();
  const pixels = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!(pixels instanceof Uint8Array)) {
    console.warn('[MobileNet] readPixels failed for', uri);
    return null;
  }

  const regions = SEARCH_REGIONS.map((box) => ({
    input: rgbaRegionToMobileNetInput(pixels, width, height, box),
    box,
  }));

  let result = classifyPreparedRegions(model, regions);
  if (result == null) {
    const input = rgbaRegionToMobileNetInput(pixels, width, height, FULL_FRAME);
    const outputs = model.runSync([input]);
    const output = outputs[0];
    if (output == null) return null;
    const dataType = model.outputs[0]?.dataType ?? 'uint8';
    const { index, score } = top1FromOutput(output, dataType);
    result = {
      index,
      label: labelForIndex(index),
      score,
      box: SEARCH_REGIONS[0]!,
    };
  }

  if (result.score >= CLASSIFY_LOCK_SCORE) {
    result = { ...result, locked: true };
  }

  return result;
}
