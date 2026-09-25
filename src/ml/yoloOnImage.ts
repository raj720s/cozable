import {
  AlphaType,
  ColorType,
  Skia,
} from '@shopify/react-native-skia';
import type { TfliteModel } from 'react-native-fast-tflite';
import { prepareYoloInputFromRgba, runYoloDetect } from './yoloRun';
import type { YoloDetection } from './yoloDecode';

/**
 * Static-image YOLO path (Step 3): test.jpg / gallery photo → detections.
 */
export async function runYoloOnImageUri(
  model: TfliteModel,
  uri: string,
): Promise<YoloDetection[]> {
  const data = await Skia.Data.fromURI(uri);
  const encoded = Skia.Image.MakeImageFromEncoded(data);
  if (encoded == null) {
    console.warn('[YOLO] Could not decode image', uri);
    return [];
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
    console.warn('[YOLO] readPixels failed', uri);
    return [];
  }

  const prepared = prepareYoloInputFromRgba(pixels, width, height);
  const dets = runYoloDetect(model, prepared);
  console.log(
    `[YOLO] ${uri} → ${dets.length} detections`,
    dets.slice(0, 5).map((d) => `${d.label} ${(d.confidence * 100).toFixed(0)}%`),
  );
  return dets;
}
