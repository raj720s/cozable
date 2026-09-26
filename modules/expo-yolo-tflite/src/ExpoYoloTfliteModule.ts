import { NativeModule, requireNativeModule } from 'expo';
import type { ModelTensorReport, YoloDetection } from './ExpoYoloTflite.types';

declare class ExpoYoloTfliteModule extends NativeModule {
  isLoaded(): boolean;
  isSupported(): boolean;
  loadModel(): Promise<ModelTensorReport>;
  getTensorInfo(): ModelTensorReport;
  detectRgb(
    pixels: Uint8Array,
    width: number,
    height: number,
    stride: number,
    channels: number,
    isBgra: boolean,
  ): Promise<YoloDetection[]>;
  detectImageUri(uri: string): Promise<YoloDetection[]>;
  /** Draw boxes onto image; returns filesystem path of annotated JPEG. */
  annotateImageUri(
    uri: string,
    detections: YoloDetection[],
  ): Promise<string>;
  unload(): Promise<void>;
}

export default requireNativeModule<ExpoYoloTfliteModule>('ExpoYoloTflite');
