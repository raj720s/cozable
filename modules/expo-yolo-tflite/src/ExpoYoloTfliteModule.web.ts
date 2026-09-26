import { NativeModule, registerWebModule } from 'expo';
import type { ModelTensorReport, YoloDetection } from './ExpoYoloTflite.types';

class ExpoYoloTfliteModuleWeb extends NativeModule {
  isLoaded(): boolean {
    return false;
  }
  isSupported(): boolean {
    return false;
  }
  async loadModel(): Promise<ModelTensorReport> {
    throw new Error('ExpoYoloTflite is not available on web');
  }
  getTensorInfo(): ModelTensorReport {
    throw new Error('ExpoYoloTflite is not available on web');
  }
  async detectRgb(
    _pixels: Uint8Array,
    _width: number,
    _height: number,
    _stride: number,
    _channels: number,
    _isBgra: boolean,
  ): Promise<YoloDetection[]> {
    throw new Error('ExpoYoloTflite is not available on web');
  }
  async detectImageUri(_uri: string): Promise<YoloDetection[]> {
    throw new Error('ExpoYoloTflite is not available on web');
  }
  async annotateImageUri(
    _uri: string,
    _detections: YoloDetection[],
  ): Promise<string> {
    throw new Error('ExpoYoloTflite is not available on web');
  }
  async unload(): Promise<void> {}
}

export default registerWebModule(ExpoYoloTfliteModuleWeb, 'ExpoYoloTflite');
