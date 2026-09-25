import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  useTensorflowModel,
  type TfliteModel,
} from 'react-native-fast-tflite';
import {
  logModelTensors,
  type ModelTensorReport,
} from './inspectModel';
import { YOLO_INT8_ASSET } from './modelAsset';

type ModelState = 'loading' | 'loaded' | 'error';

type AppModelContextValue = {
  model: TfliteModel | undefined;
  state: ModelState;
  error: Error | undefined;
  /** Inspected input/output tensors once the model has loaded. */
  tensors: ModelTensorReport | undefined;
  /** True once loading finished (success or failure). */
  isReady: boolean;
};

const AppModelContext = createContext<AppModelContextValue | null>(null);

/** Stable empty delegates array — CPU default. */
const YOLO_DELEGATES: [] = [];

/**
 * Loads YOLOv8n int8 once at app startup and shares the Nitro HybridObject
 * with screens (camera frame processors, gallery).
 */
export function ModelProvider({ children }: { children: ReactNode }) {
  const plugin = useTensorflowModel(YOLO_INT8_ASSET, YOLO_DELEGATES);
  const didLog = useRef(false);

  const tensors = useMemo<ModelTensorReport | undefined>(() => {
    if (plugin.state !== 'loaded' || plugin.model == null) return undefined;
    return {
      inputs: plugin.model.inputs.map((t, index) => ({
        index,
        name: t.name,
        shape: [...t.shape],
        dataType: t.dataType,
      })),
      outputs: plugin.model.outputs.map((t, index) => ({
        index,
        name: t.name,
        shape: [...t.shape],
        dataType: t.dataType,
      })),
    };
  }, [plugin]);

  useEffect(() => {
    if (plugin.state !== 'loaded' || plugin.model == null || didLog.current) return;
    didLog.current = true;
    logModelTensors(plugin.model, 'YOLOv8n Int8');

    // Prove Invoke works (zeros) before the camera ever runs.
    try {
      const bytes =
        plugin.model.inputs[0]!.shape.reduce((a, b) => a * b, 1) * 4;
      const zeros = new ArrayBuffer(bytes);
      const t0 = Date.now();
      const outs = plugin.model.runSync([zeros]);
      const outBytes = outs[0]?.byteLength ?? 0;
      console.log(
        `[YOLOv8n Int8] smoke Invoke OK in ${Date.now() - t0}ms · out ${outBytes} bytes`,
      );
    } catch (error) {
      console.warn('[YOLOv8n Int8] smoke Invoke FAILED', error);
    }
  }, [plugin.state, plugin.model]);

  const value = useMemo<AppModelContextValue>(() => {
    if (plugin.state === 'loaded') {
      return {
        model: plugin.model,
        state: 'loaded',
        error: undefined,
        tensors,
        isReady: true,
      };
    }
    if (plugin.state === 'error') {
      return {
        model: undefined,
        state: 'error',
        error: plugin.error,
        tensors: undefined,
        isReady: true,
      };
    }
    return {
      model: undefined,
      state: 'loading',
      error: undefined,
      tensors: undefined,
      isReady: false,
    };
  }, [plugin, tensors]);

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
