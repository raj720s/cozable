import { useEffect } from 'react';
import ExpoYoloTflite from 'expo-yolo-tflite';
import { useAppModel } from './ModelProvider';

/**
 * Logs tensor shapes once the native model is already loaded.
 * Must never trigger loadModel / ensureInterpreter — getTensorInfo is read-only.
 */
export function useTensorDebug() {
  const { isLoaded } = useAppModel();

  useEffect(() => {
    if (!isLoaded) return;
    try {
      // Sync read only — Kotlin getTensorInfo does not call ensureInterpreter().
      if (!ExpoYoloTflite.isLoaded()) return;
      const info = ExpoYoloTflite.getTensorInfo();
      console.log(
        'TENSORS:',
        JSON.stringify(
          {
            inputShape: info.inputShape,
            inputDtype: info.inputDtype,
            outputShape: info.outputShape,
            outputDtype: info.outputDtype,
            numClasses: info.numClasses,
            usingGpu: info.usingGpu ?? false,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      // Model not loaded yet or getTensorInfo threw — never force a load.
      console.warn('useTensorDebug: getTensorInfo failed', e);
    }
  }, [isLoaded]);
}
