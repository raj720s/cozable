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
  annotateVideoUri: (
    uri: string,
    frameReports: Array<{ atMs: number; detections: YoloDetection[] }>,
    confThresh: number,
  ) => Promise<string>;
};

const AppModelContext = createContext<AppModelContextValue | null>(null);

/** Must match Kotlin INPUT_SIZE for warm-up letterbox path. */
const WARMUP_SIZE = 480;

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
 * Loads native YOLO (LiteRT) once after first paint, then warms up inference
 * so the first live/SNAP frame does not pay Interpreter init cost.
 */
export function ModelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModelState>('loading');
  const [error, setError] = useState<Error | undefined>();
  const [tensors, setTensors] = useState<ModelTensorReport | undefined>();
  const isSupported = ExpoYoloTflite.isSupported();

  useEffect(() => {
    let cancelled = false;
    const t0 = Date.now();

    // Defer until after first paint so splash / login are not fighting model I/O.
    const timer = setTimeout(() => {
      void (async () => {
        if (!ExpoYoloTflite.isSupported()) {
          if (!cancelled) {
            setState('error');
            setError(new Error('ExpoYoloTflite is not supported on this platform'));
          }
          return;
        }
        try {
          setState('loading');
          console.log('[MODEL] load start');
          const report = await ExpoYoloTflite.loadModel();
          if (cancelled) return;
          console.log(`[MODEL] load done in ${Date.now() - t0}ms`, {
            usingGpu: report.usingGpu,
            inputShape: report.inputShape,
            outputShape: report.outputShape,
          });
          setTensors(report);
          logTensorReport(report, 'YOLOv8 day-colour (native)');

          // Force tensor alloc / graph compile off the critical UI path.
          const dummyPixels = new Uint8Array(WARMUP_SIZE * WARMUP_SIZE * 3);
          const t1 = Date.now();
          try {
            await ExpoYoloTflite.detectRgb(
              dummyPixels,
              WARMUP_SIZE,
              WARMUP_SIZE,
              WARMUP_SIZE * 3,
              3,
              false,
            );
            if (!cancelled) {
              console.log(`[MODEL] warm-up done in ${Date.now() - t1}ms`);
            }
          } catch (warmErr) {
            console.warn('[MODEL] warm-up skipped:', warmErr);
          }

          if (cancelled) return;
          // Mark loaded only after warm-up so the first live frame is fast.
          setState('loaded');
          setError(undefined);
        } catch (e) {
          if (cancelled) return;
          console.error('[MODEL] failed:', e);
          setState('error');
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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
      annotateVideoUri: (uri, frameReports, confThresh) =>
        ExpoYoloTflite.annotateVideoUri(uri, frameReports, confThresh),
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
