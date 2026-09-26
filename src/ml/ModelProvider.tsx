import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import ExpoYoloTflite from 'expo-yolo-tflite';
import type {
  ModelTensorReport,
  YoloDetection,
} from 'expo-yolo-tflite';

type ModelState = 'loading' | 'loaded' | 'error';

type AppModelContextValue = {
  isLoaded: boolean;
  state: ModelState;
  error: Error | undefined;
  tensors: ModelTensorReport | undefined;
  isReady: boolean;
  isSupported: boolean;
  detectImageUri: (uri: string) => Promise<YoloDetection[]>;
  detectRgb: (
    pixels: Uint8Array,
    width: number,
    height: number,
    stride: number,
    channels: number,
    isBgra: boolean,
  ) => Promise<YoloDetection[]>;
  annotateImageUri: (
    uri: string,
    detections: YoloDetection[],
  ) => Promise<string>;
};

const AppModelContext = createContext<AppModelContextValue | null>(null);

function logTensorReport(report: ModelTensorReport, label: string) {
  console.log(`[${label}] model loaded`);
  console.log(
    'TENSORS:',
    JSON.stringify(
      {
        inputShape: report.inputShape,
        inputDtype: report.inputDtype,
        outputShape: report.outputShape,
        outputDtype: report.outputDtype,
        numClasses: report.numClasses,
        usingGpu: report.usingGpu ?? false,
      },
      null,
      2,
    ),
  );
  console.log(`[${label}] inputs (${report.inputs.length}):`);
  for (const input of report.inputs) {
    console.log(
      `  [${input.index}] name="${input.name}" shape=[${input.shape.join(', ')}] type=${input.dataType}`,
    );
  }
  console.log(`[${label}] outputs (${report.outputs.length}):`);
  for (const output of report.outputs) {
    console.log(
      `  [${output.index}] name="${output.name}" shape=[${output.shape.join(', ')}] type=${output.dataType}`,
    );
  }
}

/**
 * Loads native YOLOv8n (LiteRT Expo module) once at startup.
 */
export function ModelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModelState>('loading');
  const [error, setError] = useState<Error | undefined>();
  const [tensors, setTensors] = useState<ModelTensorReport | undefined>();
  const isSupported = ExpoYoloTflite.isSupported();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ExpoYoloTflite.isSupported()) {
        if (!cancelled) {
          setState('error');
          setError(new Error('ExpoYoloTflite is not supported on this platform'));
        }
        return;
      }
      try {
        setState('loading');
        const report = await ExpoYoloTflite.loadModel();
        if (cancelled) return;
        setTensors(report);
        setState('loaded');
        setError(undefined);
        logTensorReport(report, 'YOLOv8n Int8 (native)');
      } catch (e) {
        if (cancelled) return;
        console.error('Failed to load native YOLO', e);
        setState('error');
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppModelContextValue>(() => {
    return {
      isLoaded: state === 'loaded',
      state,
      error,
      tensors,
      isReady: state !== 'loading',
      isSupported,
      detectImageUri: (uri) => ExpoYoloTflite.detectImageUri(uri),
      detectRgb: (pixels, width, height, stride, channels, isBgra) =>
        ExpoYoloTflite.detectRgb(pixels, width, height, stride, channels, isBgra),
      annotateImageUri: (uri, detections) =>
        ExpoYoloTflite.annotateImageUri(uri, detections),
    };
  }, [state, error, tensors, isSupported]);

  return (
    <AppModelContext.Provider value={value}>{children}</AppModelContext.Provider>
  );
}

export function useAppModel(): AppModelContextValue {
  const ctx = useContext(AppModelContext);
  if (ctx == null) {
    throw new Error('useAppModel must be used within ModelProvider');
  }
  return ctx;
}

export type { YoloDetection, ModelTensorReport };
