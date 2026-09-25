import { useAppModel } from '@/ml/ModelProvider';
import {
  EMPTY_PREDICTION,
  type ClassificationResult,
} from '@/ml/classifyFrame';
import { renderYoloFrame } from '@/ml/skiaYoloOverlay';
import type { SkiaFrameRender } from '@/ml/skiaClassifierOverlay';
import {
  smoothDetections,
  type YoloDetection,
} from '@/ml/yoloDecode';
import {
  copyFrameForYolo,
  prepareYoloInputFromCopy,
  runYoloDetect,
  type YoloFrameCopy,
} from '@/ml/yoloRun';
import { useScanStore } from '@/store/scanStore';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
  type FlashMode,
  type Frame,
  type Photo,
  type Recorder,
  type TorchMode,
} from 'react-native-vision-camera';
import {
  SkiaCamera,
  type SkiaCameraRef,
} from 'react-native-vision-camera-skia';
import { createSynchronizable, scheduleOnRN } from 'react-native-worklets';

/** YOLO is heavier than MobileNet crops — ~5–10 Hz at 30 fps. */
const INFER_EVERY_N_FRAMES = 6;

const EMPTY_DETECTIONS: YoloDetection[] = [];

function topDetectionAsPrediction(
  dets: YoloDetection[],
): ClassificationResult {
  const top = dets[0];
  if (top == null) return EMPTY_PREDICTION;
  return {
    index: top.classId,
    label: top.label,
    score: top.confidence,
    box: { x: top.x, y: top.y, width: top.width, height: top.height },
  };
}

type FrameStats = {
  count: number;
  width: number;
  height: number;
  pixelFormat: string;
  dropped: number;
};

const EMPTY_FRAME_STATS: FrameStats = {
  count: 0,
  width: 0,
  height: 0,
  pixelFormat: '—',
  dropped: 0,
};

function isBenignCameraError(error: Error): boolean {
  const message = error.message ?? '';
  return (
    message.includes('OperationCanceledException') ||
    message.includes('Cancelled due to another zoom') ||
    message.includes('Camera is not active')
  );
}

function nextFlashMode(mode: FlashMode): FlashMode {
  if (mode === 'off') return 'on';
  if (mode === 'on') return 'auto';
  return 'off';
}

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const expectedCountParam = parseInt(params.expectedCount as string, 10);
  const isFocused = useIsFocused();

  const setExpectedCount = useScanStore((s) => s.setExpectedCount);
  const expectedCount = useScanStore((s) => s.expectedCount);
  const confirmedCount = useScanStore((s) => s.detections.length);
  const completeCapture = useScanStore((s) => s.completeCapture);
  const startScan = useScanStore((s) => s.startScan);
  const stopScan = useScanStore((s) => s.stopScan);
  const galleryCount = useScanStore((s) => s.gallery.length);
  const logPrediction = useScanStore((s) => s.logPrediction);
  const predictionLogCount = useScanStore((s) => s.predictionLog.length);

  const {
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
    canRequestPermission: canRequestCamera,
    status: cameraPermissionStatus,
  } = useCameraPermission();
  const {
    hasPermission: hasMicPermission,
    requestPermission: requestMicPermission,
    canRequestPermission: canRequestMic,
  } = useMicrophonePermission();

  const { state: modelState, model } = useAppModel();

  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [torchMode, setTorchMode] = useState<TorchMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [zoomLabel, setZoomLabel] = useState('1.0');
  const [capturing, setCapturing] = useState(false);
  const [frameStats, setFrameStats] = useState<FrameStats>(EMPTY_FRAME_STATS);
  const [prediction, setPrediction] = useState<ClassificationResult>(EMPTY_PREDICTION);
  const [detectionCount, setDetectionCount] = useState(0);
  const predictionRef = useRef(prediction);

  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'balanced' });
  const videoOutput = useVideoOutput({ enableAudio: true });
  const cameraRef = useRef<SkiaCameraRef>(null);
  const recorderRef = useRef<Recorder | null>(null);
  /** Cross-runtime frame counter for the SkiaCamera onFrame worklet. */
  const frameCounter = useMemo(() => createSynchronizable(0), []);
  /** Latest YOLO boxes shared with the Skia draw path. */
  const latestDetections = useMemo(
    () => createSynchronizable<YoloDetection[]>(EMPTY_DETECTIONS),
    [],
  );
  /**
   * Worklet-safe busy flag. Do not call AsyncRunner.isBusy() from SkiaCamera's
   * onFrame — that runtime cannot synchronously invoke Remote Functions.
   */
  const mlBusy = useMemo(() => createSynchronizable(false), []);

  const reportFrameStats = useCallback(
    (count: number, width: number, height: number, pixelFormat: string) => {
      setFrameStats((prev) => ({
        ...prev,
        count,
        width,
        height,
        pixelFormat,
      }));
    },
    [],
  );

  const reportDetections = useCallback((dets: YoloDetection[]) => {
    const next = topDetectionAsPrediction(dets);
    predictionRef.current = next;
    setDetectionCount(dets.length);
    setPrediction(next);
  }, []);

  /** Runs on the RN JS thread: letterbox + YOLO (worklet only copied pixels). */
  const runYoloOnJS = useCallback(
    (copy: YoloFrameCopy) => {
      if (model == null) {
        mlBusy.setBlocking(false);
        return;
      }
      try {
        const prepared = prepareYoloInputFromCopy(copy);
        const raw = runYoloDetect(model, prepared);
        const previous = latestDetections.getDirty();
        const smoothed = smoothDetections(previous, raw);
        latestDetections.setBlocking(smoothed);
        reportDetections(smoothed);

        const top = smoothed[0];
        if (top != null) {
          const prevTop = previous[0];
          const shouldLog =
            prevTop == null ||
            prevTop.classId !== top.classId ||
            Math.abs(prevTop.confidence - top.confidence) >= 0.08;
          if (shouldLog) {
            logPrediction(topDetectionAsPrediction(smoothed), 'live', false);
          }
        }
      } catch (error) {
        console.warn('YOLO inference failed', error);
      } finally {
        mlBusy.setBlocking(false);
      }
    },
    [latestDetections, logPrediction, mlBusy, model, reportDetections],
  );

  const onSkiaFrame = useCallback(
    (frame: Frame, render: SkiaFrameRender) => {
      'worklet';
      const next = frameCounter.getDirty() + 1;
      frameCounter.setBlocking(next);

      // 1) Always paint first with last known boxes — never stall Skia on ML.
      renderYoloFrame(render, latestDetections.getDirty());

      // 2) Claim busy BEFORE copying so concurrent frames cannot double-invoke.
      let copy: YoloFrameCopy | null = null;
      if (
        model != null &&
        next % INFER_EVERY_N_FRAMES === 0 &&
        !mlBusy.getDirty() &&
        frame.hasPixelBuffer
      ) {
        mlBusy.setBlocking(true);
        copy = copyFrameForYolo(frame);
        if (copy == null) {
          mlBusy.setBlocking(false);
        }
      }

      if (next % 20 === 0) {
        scheduleOnRN(
          reportFrameStats,
          next,
          frame.width,
          frame.height,
          String(frame.pixelFormat),
        );
      }

      // 3) Frame is done for preview — release before heavy ML on JS.
      frame.dispose();

      // 4) Letterbox + detect on the RN thread.
      if (copy != null) {
        scheduleOnRN(runYoloOnJS, copy);
      }
    },
    [
      frameCounter,
      latestDetections,
      mlBusy,
      model,
      reportFrameStats,
      runYoloOnJS,
    ],
  );

  useEffect(() => {
    if (!Number.isNaN(expectedCountParam) && expectedCountParam > 0) {
      setExpectedCount(expectedCountParam);
    }
    startScan();
    return () => stopScan();
  }, [expectedCountParam, setExpectedCount, startScan, stopScan]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      if (state !== 'active') {
        setCameraStarted(false);
        setTorchMode('off');
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (cameraPosition === 'front' || !device?.hasTorch) {
      setTorchMode('off');
    }
  }, [cameraPosition, device?.hasTorch]);

  const openPermissionSettings = useCallback(() => {
    Alert.alert(
      'Permission required',
      cameraPermissionStatus === 'restricted'
        ? 'Camera access is restricted on this device.'
        : 'Enable Camera (and Microphone for recording) in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  }, [cameraPermissionStatus]);

  const ensurePermissions = useCallback(async () => {
    setPermissionBusy(true);
    try {
      let cameraOk = hasCameraPermission;
      if (!cameraOk && canRequestCamera) {
        cameraOk = await requestCameraPermission();
      }
      if (!hasMicPermission && canRequestMic) {
        await requestMicPermission();
      }
      if (!cameraOk) {
        openPermissionSettings();
        return false;
      }
      return true;
    } finally {
      setPermissionBusy(false);
    }
  }, [
    canRequestCamera,
    canRequestMic,
    hasCameraPermission,
    hasMicPermission,
    openPermissionSettings,
    requestCameraPermission,
    requestMicPermission,
  ]);

  const outputs = useMemo(() => [photoOutput, videoOutput], [photoOutput, videoOutput]);

  const isActive =
    hasCameraPermission &&
    isFocused &&
    appActive &&
    Boolean(device) &&
    sessionError == null;

  const handleSessionError = useCallback((error: Error) => {
    if (isBenignCameraError(error)) {
      console.warn('Ignored benign camera control error', error.message);
      return;
    }
    console.error('Camera session error', error);
    setCameraStarted(false);
    setSessionError(error.message || 'Unknown camera error');
  }, []);

  const applyZoom = useCallback(async (nextZoom: number) => {
    const controller = cameraRef.current?.controller;
    if (!controller) return;
    try {
      await controller.setZoom(nextZoom);
      setZoomLabel(nextZoom.toFixed(1));
    } catch (error) {
      if (error instanceof Error && isBenignCameraError(error)) return;
      console.warn('Zoom failed', error);
    }
  }, []);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      if (!device || !cameraStarted) return;
      const controller = cameraRef.current?.controller;
      const current = controller?.zoom ?? 1;
      const minZoom = device.minZoom ?? 1;
      const maxZoom = Math.min(device.maxZoom ?? 8, 8);
      const step = 0.5;
      const next =
        direction === 'in'
          ? Math.min(current + step, maxZoom)
          : Math.max(current - step, minZoom);
      void applyZoom(next);
    },
    [applyZoom, cameraStarted, device],
  );

  const handleCapturePhoto = async () => {
    if (!hasCameraPermission) {
      await ensurePermissions();
      return;
    }
    if (!photoOutput || !isActive || !cameraStarted || capturing) {
      Alert.alert('Camera not ready', 'Wait for the preview, then try again.');
      return;
    }
    setCapturing(true);
    try {
      const photo: Photo = await photoOutput.capturePhoto({ flashMode }, {});
      const path = await photo.saveToTemporaryFileAsync();
      const width = photo.width;
      const height = photo.height;
      photo.dispose();

      const snapPrediction = predictionRef.current;
      await completeCapture(
        {
          kind: 'photo',
          path,
          width,
          height,
          capturedAt: Date.now(),
        },
        expectedCount,
        snapPrediction.index >= 0 ? snapPrediction : null,
      );

      router.replace({
        pathname: '/summary',
        params: { expectedCount: String(expectedCount) },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not capture photo.';
      Alert.alert('Capture Error', message);
    } finally {
      setCapturing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!hasCameraPermission) {
      await ensurePermissions();
      return;
    }
    if (!hasMicPermission) {
      if (canRequestMic) {
        const granted = await requestMicPermission();
        if (!granted) {
          openPermissionSettings();
          return;
        }
      } else {
        openPermissionSettings();
        return;
      }
    }
    if (!videoOutput || !isActive || !cameraStarted) {
      Alert.alert('Camera not ready', 'Wait for the preview, then try again.');
      return;
    }

    if (isRecording) {
      try {
        await recorderRef.current?.stopRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not stop recording.';
        Alert.alert('Recording Error', message);
        setIsRecording(false);
        recorderRef.current = null;
      }
      return;
    }

    setIsRecording(true);
    try {
      const recorder = await videoOutput.createRecorder({});
      recorderRef.current = recorder;
      await recorder.startRecording(
        (filePath) => {
          setIsRecording(false);
          recorderRef.current = null;
          setTorchMode('off');
          void (async () => {
            const snapPrediction = predictionRef.current;
            await completeCapture(
              {
                kind: 'video',
                path: filePath,
                capturedAt: Date.now(),
              },
              expectedCount,
              snapPrediction.index >= 0 ? snapPrediction : null,
            );
            router.replace({
              pathname: '/summary',
              params: { expectedCount: String(expectedCount) },
            });
          })();
        },
        (error: Error) => {
          setIsRecording(false);
          recorderRef.current = null;
          Alert.alert('Recording Failure', error.message);
        },
      );
    } catch (error) {
      setIsRecording(false);
      recorderRef.current = null;
      const message = error instanceof Error ? error.message : 'Could not start recording.';
      Alert.alert('Recording Error', message);
    }
  };

  const handleFinish = () => {
    stopScan();
    router.replace({
      pathname: '/summary',
      params: { expectedCount: String(expectedCount) },
    });
  };

  const toggleFlash = () => setFlashMode((prev) => nextFlashMode(prev));
  const toggleTorch = () => {
    if (!device?.hasTorch || cameraPosition === 'front') {
      Alert.alert('Torch unavailable', 'Torch is only available on the back camera.');
      return;
    }
    setTorchMode((prev) => (prev === 'off' ? 'on' : 'off'));
  };
  const toggleCameraPosition = () => {
    setCameraStarted(false);
    setSessionError(null);
    setTorchMode('off');
    setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  if (!hasCameraPermission) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Camera access required</Text>
        <Text style={styles.fallbackText}>
          Status: {cameraPermissionStatus}. Enable Camera to continue.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => void ensurePermissions()}
          disabled={permissionBusy}
        >
          <Text style={styles.permissionButtonText}>
            {canRequestCamera ? 'Allow Camera' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>No camera device</Text>
        <Text style={styles.fallbackText}>
          Could not find a {cameraPosition} camera. Try the other lens or check Settings.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={toggleCameraPosition}>
          <Text style={styles.permissionButtonText}>Try other lens</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Camera unavailable</Text>
        <Text style={styles.fallbackText}>{sessionError}</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            setSessionError(null);
            setCameraStarted(false);
          }}
        >
          <Text style={styles.permissionButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionButton} onPress={() => Linking.openSettings()}>
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const modelStatusLabel =
    modelState === 'loaded'
      ? 'YOLOv8n live'
      : modelState === 'error'
        ? 'Model failed'
        : 'Loading model…';

  const frameMetaLabel =
    frameStats.count > 0
      ? `Skia #${frameStats.count} · ${frameStats.width}×${frameStats.height} · ${frameStats.pixelFormat}`
      : 'SkiaCamera waiting for frames…';

  const predictionLabel =
    prediction.index >= 0
      ? `${prediction.label}  ${(prediction.score * 100).toFixed(0)}% · ${detectionCount} box${detectionCount === 1 ? '' : 'es'}`
      : detectionCount > 0
        ? `${detectionCount} detections`
        : 'Point camera at COCO objects…';

  const flashLabel =
    flashMode === 'off' ? 'Flash Off' : flashMode === 'on' ? 'Flash On' : 'Flash Auto';

  return (
    <View style={styles.container}>
      <SkiaCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={outputs}
        torchMode={torchMode}
        pixelFormat="rgb"
        enablePreviewSizedOutputBuffers
        targetResolution={CommonResolutions.VGA_4_3}
        onFrame={onSkiaFrame}
        getInitialZoom={() => device.minZoom ?? 1}
        onStarted={() => {
          frameCounter.setBlocking(0);
          latestDetections.setBlocking(EMPTY_DETECTIONS);
          setFrameStats(EMPTY_FRAME_STATS);
          setPrediction(EMPTY_PREDICTION);
          setDetectionCount(0);
          setCameraStarted(true);
          setSessionError(null);
          setZoomLabel((device.minZoom ?? 1).toFixed(1));
        }}
        onStopped={() => setCameraStarted(false)}
        onError={handleSessionError}
      />

      <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Text style={styles.iconText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/gallery')}
            >
              <Text style={styles.iconText}>
                Gallery{galleryCount > 0 ? ` (${galleryCount})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
              <Text style={styles.iconText}>{flashLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.iconButton,
                torchMode === 'on' && styles.iconButtonActive,
                (!device.hasTorch || cameraPosition === 'front') && styles.iconButtonDisabled,
              ]}
              onPress={toggleTorch}
            >
              <Text style={styles.iconText}>{torchMode === 'on' ? 'Torch On' : 'Torch'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleCameraPosition}>
              <Text style={styles.iconText}>Flip</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.midRow} pointerEvents="box-none">
          <View style={styles.detectionCard}>
            <View style={styles.modelRow}>
              {!cameraStarted || modelState === 'loading' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : null}
              <Text style={styles.modelStatus}>
                {!cameraStarted ? 'Starting camera…' : modelStatusLabel}
              </Text>
              <Text style={styles.coverage}>
                {confirmedCount}/{expectedCount}
              </Text>
            </View>

            <Text style={styles.detectionMeta}>{frameMetaLabel}</Text>
            <Text style={styles.predictionText}>{predictionLabel}</Text>
            <Text style={styles.detectionMeta}>
              Throttled YOLO · log {predictionLogCount}
            </Text>
          </View>

          <View style={styles.zoomContainer}>
            <TouchableOpacity style={styles.zoomButton} onPress={() => handleZoom('in')}>
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{zoomLabel}x</Text>
            <TouchableOpacity style={styles.zoomButton} onPress={() => handleZoom('out')}>
              <Text style={styles.zoomText}>-</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shutterButton, styles.photoShutter, capturing && styles.disabled]}
            onPress={() => void handleCapturePhoto()}
            disabled={capturing}
          >
            <Text style={styles.shutterLabel}>{capturing ? '…' : 'SNAP'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shutterButton,
              isRecording ? styles.recordingActive : styles.videoShutter,
            ]}
            onPress={() => void handleToggleRecording()}
          >
            <View style={isRecording ? styles.stopSquare : styles.recordCircle} />
            <Text style={[styles.shutterLabel, isRecording && styles.shutterLabelLight]}>
              {isRecording ? 'STOP' : 'REC'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 24,
    gap: 12,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 15,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    flex: 1,
  },
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconButtonActive: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  iconButtonDisabled: {
    opacity: 0.45,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detectionCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modelStatus: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  coverage: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '700',
  },
  detectionLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  detectionMeta: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
  },
  predictionText: {
    color: '#42d77d',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  predictionLocked: {
    color: '#FDE68A',
  },
  unlockBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(253, 230, 138, 0.18)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unlockBtnText: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '700',
  },
  colorSwatch: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  confirmBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  zoomContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  zoomButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  zoomLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginBottom: 8,
  },
  finishButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 30,
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
  },
  finishButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  shutterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
    gap: 8,
  },
  photoShutter: {
    backgroundColor: '#FFFFFF',
  },
  videoShutter: {
    backgroundColor: '#EF4444',
  },
  recordingActive: {
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  disabled: {
    opacity: 0.6,
  },
  shutterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  shutterLabelLight: {
    color: '#FFFFFF',
  },
  recordCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
});
