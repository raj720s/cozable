import { useEffect } from 'react';
import ExpoYoloTflite from 'expo-yolo-tflite';
import { useAppModel } from './ModelProvider';

/**
 * Temporary: logs model tensor shapes to Metro once the native model is loaded.
 * Expected (day-colour float32 export):
 *   inputShape  [1, 3, 640, 640]
 *   outputShape [1, 11, 8400]
 *   numClasses  7
 */
export function useTensorDebug() {
  const { isLoaded } = useAppModel();

  useEffect(() => {
    if (!isLoaded) return;
    try {
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
      console.warn('useTensorDebug: getTensorInfo failed', e);
    }
  }, [isLoaded]);
}
