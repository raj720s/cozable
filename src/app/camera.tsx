import { useAppModel, type YoloDetection } from '@/ml/ModelProvider';
import {
  EMPTY_PREDICTION,
  type ClassificationResult,
} from '@/ml/prediction';
import { useTensorDebug } from '@/ml/useTensorDebug';
import { useScanStore } from '@/store/scanStore';
import { CLASS_COLORS_BY_ID, colors, fonts } from '@/theme/scanner';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
  type CameraRef,
  type FlashMode,
  type Frame,
  type Photo,
  type Recorder,
  type TorchMode,
} from 'react-native-vision-camera';
import { createSynchronizable, scheduleOnRN } from 'react-native-worklets';

/** Cap live YOLO to ~10 Hz (VisionCamera v5 has no runAtTargetFps helper). */
const INFER_INTERVAL_MS = 100;

/** Inference-only frame size — preview stays full quality via Camera view. */
const INFER_RESOLUTION = { width: 320, height: 240 };

const EMPTY_DETECTIONS: YoloDetection[] = [];

const CLASS_COLORS = CLASS_COLORS_BY_ID;

function toFileUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  return `file://${path}`;
}

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

type FramePixelPacket = {
  pixels: Uint8Array;
  width: number;
  height: number;
  stride: number;
  channels: number;
  isBgra: boolean;
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
  // Temporary: confirm day-colour model shapes in Metro (AGENTS.md)
  useTensorDebug();

  const router = useRouter();
  const params = useLocalSearchParams();
  const expectedCountParam = parseInt(params.expectedCount as string, 10);
  const isFocused = useIsFocused();

  const setExpectedCount = useScanStore((s) => s.setExpectedCount);
  const expectedCount = useScanStore((s) => s.expectedCount);
  const completeCapture = useScanStore((s) => s.completeCapture);
  const startScan = useScanStore((s) => s.startScan);
  const stopScan = useScanStore((s) => s.stopScan);
  const logPrediction = useScanStore((s) => s.logPrediction);

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

  const { state: modelState, isLoaded, detectImageUri, detectRgb, annotateImageUri } =
    useAppModel();

  useEffect(() => {
    console.log('[CAM] mounted, model loaded:', isLoaded, 'state:', modelState);
  }, [isLoaded, modelState]);

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
  const [frameCount, setFrameCount] = useState(0);
  const [prediction, setPrediction] = useState<ClassificationResult>(EMPTY_PREDICTION);
  const [detections, setDetections] = useState<YoloDetection[]>(EMPTY_DETECTIONS);
  const predictionRef = useRef(prediction);
  const detectionsRef = useRef<YoloDetection[]>(EMPTY_DETECTIONS);
  // Live frame dimensions from the camera. Updated per inference (ref, not state,
  // to avoid re-render churn). Default matches INFER_RESOLUTION.
  const frameDimsRef = useRef({ w: INFER_RESOLUTION.width, h: INFER_RESOLUTION.height });
  /** Preview layout inside SafeAreaView (excludes status/home black bars). */
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const { width: windowW, height: windowH } = useWindowDimensions();
  const previewW = previewSize.width > 0 ? previewSize.width : windowW;
  const previewH = previewSize.height > 0 ? previewSize.height : windowH;

  useEffect(() => {
    console.log('[RENDER] overlay', detections.length, 'boxes');
    detections.slice(0, 3).forEach((d, i) => {
      console.log('[RENDER] box', i, d.label, d.confidence.toFixed(3), d);
    });
  }, [detections]);

  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput({
    qualityPrioritization: 'balanced',
    targetResolution: CommonResolutions.HD_4_3,
  });
  const videoOutput = useVideoOutput({ enableAudio: true });
  const cameraRef = useRef<CameraRef>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const frameCounter = useMemo(() => createSynchronizable(0), []);
  /** Worklet-safe busy flag — never call native isBusy from the frame thread. */
  const mlBusy = useMemo(() => createSynchronizable(false), []);
  /** Last inference timestamp (ms) for FPS throttle. */
  const lastInferAt = useMemo(() => createSynchronizable(0), []);

  const reportDetections = useCallback((dets: YoloDetection[]) => {
    const next = topDetectionAsPrediction(dets);
    predictionRef.current = next;
    detectionsRef.current = dets;
    setDetections(dets);
    setPrediction(next);
  }, []);

  const reportFrameCount = useCallback((count: number) => {
    setFrameCount(count);
    console.log('[FRAME] count', count);
  }, []);

  const runDetectRgbOnJS = useCallback(
    (packet: FramePixelPacket) => {
      if (!isLoaded) {
        mlBusy.setBlocking(false);
        return;
      }
      void (async () => {
        try {
          // Record actual frame dims for coordinate mapping
          frameDimsRef.current = { w: packet.width, h: packet.height };
          const dets = await detectRgb(
            packet.pixels,
            packet.width,
            packet.height,
            packet.stride,
            packet.channels,
            packet.isBgra,
          );
          console.log(
            '[LIVE] detectRgb →',
            dets.length,
            dets[0] ?? null,
            `${packet.width}x${packet.height}`,
          );
          console.log('[DETECT] count:', dets.length);
          dets.slice(0, 3).forEach((d) => console.log('[DETECT] box:', d));
          reportDetections(dets);
          const top = dets[0];
          if (top != null) {
            const prev = predictionRef.current;
            if (
              prev.index !== top.classId ||
              Math.abs(prev.score - top.confidence) >= 0.1
            ) {
              logPrediction(topDetectionAsPrediction(dets), 'live', false);
            }
          }
        } catch (error) {
          console.warn('Native YOLO frame detect failed', error);
        } finally {
          mlBusy.setBlocking(false);
        }
      })();
    },
    [detectRgb, isLoaded, logPrediction, mlBusy, reportDetections],
  );

  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      const next = frameCounter.getDirty() + 1;
      frameCounter.setBlocking(next);

      if (next % 30 === 0) {
        scheduleOnRN(reportFrameCount, next);
      }

      let packet: FramePixelPacket | null = null;
      const now = Date.now();
      const due = now - lastInferAt.getDirty() >= INFER_INTERVAL_MS;
      if (
        due &&
        !mlBusy.getDirty() &&
        frame.hasPixelBuffer &&
        frame.width > 0
      ) {
        const width = frame.width;
        const height = frame.height;
        const stride = Math.max(frame.bytesPerRow, width * 3);
        const format = String(frame.pixelFormat);
        const isBgra = format.includes('bgra');
        const channels = stride >= width * 4 ? 4 : 3;
        // Single copy — buffer is invalidated when Frame is disposed.
        // True AHardwareBuffer zero-copy needs a native HybridObject; Expo
        // still marshals Uint8Array → ByteArray once across the bridge.
        packet = {
          pixels: new Uint8Array(frame.getPixelBuffer()),
          width,
          height,
          stride,
          channels,
          isBgra,
        };
        lastInferAt.setBlocking(now);
      }

      frame.dispose();

      if (packet != null) {
        mlBusy.setBlocking(true);
        scheduleOnRN(runDetectRgbOnJS, packet);
      }
    },
    [frameCounter, lastInferAt, mlBusy, reportFrameCount, runDetectRgbOnJS],
  );

  const frameOutput = useFrameOutput({
    // LiteRT converts YUV→RGB internally; deliver RGB from the camera pipeline.
    pixelFormat: 'rgb',
    // Decouple from preview: smaller buffers for ML only.
    targetResolution: INFER_RESOLUTION,
    enablePreviewSizedOutputBuffers: false,
    enablePhysicalBufferRotation: true,
    dropFramesWhileBusy: true,
    onFrame,
  });

  const outputs = useMemo(
    () => [photoOutput, videoOutput, frameOutput],
    [photoOutput, videoOutput, frameOutput],
  );

  const isActive =
    hasCameraPermission &&
    isFocused &&
    appActive &&
    Boolean(device) &&
    sessionError == null;

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

      const uri = toFileUri(path);
      // Fresh detect on the saved photo so boxes match the gallery image.
      let dets: YoloDetection[] = [];
      if (isLoaded) {
        try {
          dets = await detectImageUri(uri);
        } catch (error) {
          console.warn('SNAP detect failed — using live boxes', error);
          dets = detectionsRef.current;
        }
      } else {
        dets = detectionsRef.current;
      }

      let savePath = path;
      if (dets.length > 0) {
        try {
          const annotated = await annotateImageUri(uri, dets);
          savePath = annotated;
        } catch (error) {
          console.warn('Annotate SNAP failed — saving raw photo', error);
        }
      }

      const snapPrediction = topDetectionAsPrediction(dets);
      await completeCapture(
        {
          kind: 'photo',
          path: savePath,
          width,
          height,
          capturedAt: Date.now(),
        },
        expectedCount,
        snapPrediction.index >= 0 ? snapPrediction : null,
        dets.length > 0 ? dets : null,
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
            // Video file itself is never run through YOLO — only attach last live boxes.
            const liveDets = detectionsRef.current;
            const snapPrediction = topDetectionAsPrediction(liveDets);
            await completeCapture(
              {
                kind: 'video',
                path: filePath,
                capturedAt: Date.now(),
              },
              expectedCount,
              snapPrediction.index >= 0 ? snapPrediction : null,
              liveDets.length > 0 ? liveDets : null,
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
      ? 'YOLOv8n live frames'
      : modelState === 'error'
        ? 'Model failed'
        : 'Loading model…';

  const frameMetaLabel =
    frameCount > 0
      ? `Frame #${frameCount} · ${detections.length} box${detections.length === 1 ? '' : 'es'}`
      : 'Waiting for camera frames…';

  const predictionLabel =
    prediction.index >= 0
      ? `${prediction.label}  ${(prediction.score * 100).toFixed(0)}%`
      : 'Point camera at day-colour tray labels…';

  return (
    <View style={styles.container}>
      {/*
        Safe area keeps Camera + YOLO overlay out of status/home black bars.
        Those insets stay pure black and are never part of the frame buffer
        used for detectRgb / overlay mapping.
      */}
      <SafeAreaView style={styles.safePreview} edges={['top', 'bottom']}>
        <View
          style={styles.previewFrame}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setPreviewSize({ width, height });
          }}
        >
          <Camera
            resizeMode="contain"
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            outputs={outputs}
            torchMode={torchMode}
            enableNativeZoomGesture
            onStarted={() => {
              frameCounter.setBlocking(0);
              setPrediction(EMPTY_PREDICTION);
              setDetections(EMPTY_DETECTIONS);
              setFrameCount(0);
              setCameraStarted(true);
              setSessionError(null);
              setZoomLabel((device.minZoom ?? 1).toFixed(1));
            }}
            onStopped={() => setCameraStarted(false)}
            onError={handleSessionError}
          />

          {/* YOLO live overlay — frame-normalized → preview-pixel transform */}
          <View style={styles.yoloOverlayRoot} pointerEvents="none">
            {detections.map((d, i) => {
              const { w: FW, h: FH } = frameDimsRef.current;
              const isFront = cameraPosition === 'front';
              // Camera uses resizeMode="contain" — letterbox inside previewFrame
              const scale = Math.min(previewW / FW, previewH / FH);
              const scaledW = FW * scale;
              const scaledH = FH * scale;
              const offsetX = (previewW - scaledW) / 2;
              const offsetY = (previewH - scaledH) / 2;

              const w = d.width * scaledW;
              const h = d.height * scaledH;

              let left = d.x * scaledW + offsetX;
              const top = d.y * scaledH + offsetY;

              if (isFront) {
                left = previewW - left - w;
              }

              const drawW = Math.max(w, 60);
              const drawH = Math.max(h, 30);
              const color = CLASS_COLORS[d.classId] ?? '#00FF00';

              return (
                <View
                  key={i}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width: drawW,
                    height: drawH,
                    borderWidth: 3,
                    borderColor: color,
                    backgroundColor: 'transparent',
                    zIndex: 999,
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: -22,
                      left: 0,
                      backgroundColor: color,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 3,
                    }}
                  >
                    <Text
                      style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}
                      numberOfLines={1}
                    >
                      {d.label} {(d.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.overlayContainer} pointerEvents="box-none">
            <View style={styles.topRow}>
              <View style={styles.topLeft}>
                <TouchableOpacity style={styles.hudIcon} onPress={() => router.back()}>
                  <Text style={styles.hudIconText}>←</Text>
                </TouchableOpacity>
                <View style={styles.scanBadge}>
                  <Text style={styles.scanBadgeText}>Scan #01</Text>
                </View>
              </View>

              <View style={styles.detectPill}>
                <View style={styles.detectDot} />
                <Text style={styles.detectPillText}>
                  {detections.length} / {expectedCount} DETECTED
                </Text>
              </View>

              <View style={styles.topActions}>
                <TouchableOpacity
                  style={[
                    styles.hudIcon,
                    torchMode === 'on' && styles.hudIconActive,
                    (!device.hasTorch || cameraPosition === 'front') &&
                      styles.hudIconDisabled,
                  ]}
                  onPress={toggleTorch}
                >
                  <Text style={styles.hudIconText}>{torchMode === 'on' ? '✦' : '✧'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.hudIcon}
                  onPress={() => router.push('/gallery')}
                >
                  <Text style={styles.hudIconText}>⚙</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.midRow} pointerEvents="box-none">
              <View style={styles.detectionCard}>
                <View style={styles.modelRow}>
                  {!cameraStarted || modelState === 'loading' ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : null}
                  <Text style={styles.modelStatus}>
                    {!cameraStarted ? 'Starting camera…' : modelStatusLabel}
                  </Text>
                </View>
                <Text style={styles.detectionMeta}>{frameMetaLabel}</Text>
                <Text style={styles.predictionText}>{predictionLabel}</Text>
              </View>
            </View>

            {detections.some((d) => d.confidence < 0.85) ? (
              <View style={styles.attentionBar}>
                <Text style={styles.attentionText}>
                  Low-confidence label — pan closer or SNAP for a still capture.
                </Text>
              </View>
            ) : null}

            <View style={styles.bottomRow}>
              <TouchableOpacity style={styles.utilityBtn} onPress={toggleFlash}>
                <Text style={styles.utilityBtnText}>
                  {flashMode === 'off' ? '⚡' : '⚡+'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stopScanBtn, capturing && styles.disabled]}
                onPress={() => void handleCapturePhoto()}
                disabled={capturing}
              >
                <Text style={styles.stopScanText}>
                  {capturing ? 'CAPTURING…' : 'SNAP & REVIEW'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.utilityBtn, isRecording && styles.utilityBtnRec]}
                onPress={() => void handleToggleRecording()}
              >
                <View style={isRecording ? styles.stopSquare : styles.recordCircle} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.doneLink} onPress={handleFinish}>
              <Text style={styles.doneLinkText}>STOP SCAN · DONE</Text>
            </TouchableOpacity>
          </View>
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
  safePreview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewFrame: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  /** Full-bleed YOLO boxes over Camera preview. */
  yoloOverlayRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 1000,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  hudIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(18, 19, 22, 0.72)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudIconActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  hudIconDisabled: {
    opacity: 0.4,
  },
  hudIconText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.sansBold,
  },
  scanBadge: {
    backgroundColor: 'rgba(18, 19, 22, 0.72)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanBadgeText: {
    fontFamily: fonts.monoSemi,
    fontSize: 12,
    color: colors.onSurface,
  },
  detectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18, 19, 22, 0.8)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  detectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  detectPillText: {
    fontFamily: fonts.monoSemi,
    fontSize: 11,
    color: colors.onSurface,
    letterSpacing: 0.4,
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detectionCard: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 32, 0.88)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelStatus: {
    color: colors.secondary,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.4,
    flex: 1,
    textTransform: 'uppercase',
  },
  detectionMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  predictionText: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 16,
    marginTop: 2,
  },
  attentionBar: {
    backgroundColor: 'rgba(26, 28, 32, 0.92)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 8,
  },
  attentionText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.tertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  utilityBtn: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 28, 32, 0.92)',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityBtnRec: {
    borderColor: colors.error,
  },
  utilityBtnText: {
    fontSize: 18,
    color: colors.white,
  },
  stopScanBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopScanText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.6,
  },
  doneLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  doneLinkText: {
    fontFamily: fonts.monoSemi,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  recordCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.error,
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.error,
  },
});
